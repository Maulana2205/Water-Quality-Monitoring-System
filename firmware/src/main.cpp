#include <Arduino.h>
#include <WiFi.h>
#include <esp_sleep.h>
#include <ArduinoJson.h>

#include "hal_sensors.h"
#include "net.h"
#include "wifi_manager.h"
#include "secrets.h"
#include "../lib/water_logic/classifier.h"
#include "../lib/water_logic/payload.h"

// Per-cycle state kept across deep sleep (RTC memory).
RTC_DATA_ATTR uint32_t g_seq = 0;
RTC_DATA_ATTR uint8_t g_wifi_channel = 0;
RTC_DATA_ATTR uint8_t g_wifi_bssid[6] = {0};
RTC_DATA_ATTR uint32_t g_last_ntp_sync = 0;

static constexpr uint64_t kDeepSleepUs = 30ULL * 60ULL * 1000000ULL; // 30 menit
static constexpr unsigned long kWatchdogMs = 30000UL;                // 30 s
static constexpr unsigned long kPubackWaitMs = 5000UL;               // tunggu PUBACK QoS 1
static constexpr unsigned long kPortalTimeoutMs = 5UL * 60UL * 1000UL; // captive portal 5 menit

static inline bool watchdog_expired(unsigned long start_ms) {
  return (millis() - start_ms) > kWatchdogMs;
}

static void enter_sleep(unsigned long active_time_ms) {
  net_disconnect();
  sensors_power_off();

  Serial.print(F("active_time_ms="));
  Serial.println(active_time_ms);
  Serial.println(F("deep sleep 30 menit"));

  esp_sleep_enable_timer_wakeup(kDeepSleepUs);
  esp_deep_sleep_start();
}

/** Tidur tanpa sensor/net (dipakai saat belum ada kredensial WiFi). */
static void sleep_now(void) {
  WiFi.mode(WIFI_OFF);
  esp_sleep_enable_timer_wakeup(kDeepSleepUs);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  unsigned long start_ms = millis();

  // Boot counter yang bertahan di RTC memory; dashboard deteksi siklus terlewat.
  g_seq++;

  // --- 0. WiFi config mode: jika belum ada kredensial, buka captive portal ---
  if (!wifi_mgr_have_credentials()) {
    Serial.println(F("Belum ada kredensial WiFi -> captive portal"));
    if (wifi_mgr_start_portal(kPortalTimeoutMs)) {
      Serial.println(F("Kredensial tersimpan, restart..."));
      g_wifi_channel = 0;
      g_wifi_bssid[0] = 0;
      g_last_ntp_sync = 0;
      ESP.restart();
    }
    Serial.println(F("Portal timeout tanpa kredensial -> tidur"));
    sleep_now();
    return;
  }

  // --- 1. Inisialisasi sensor (ADC 11 dB, OneWire/DS18B20, gate pin) ---
  if (!sensors_init()) {
    Serial.println(F("sensors_init gagal"));
    enter_sleep(static_cast<uint32_t>(millis() - start_ms));
    return;
  }

  // --- 2. Nyalakan daya sensor + warm-up ---
  sensors_power_on();

  // --- 3. Sampling sensor ---
  // Mulai konversi DS18B20 (12-bit ~750 ms) dulu, sampling ADC sambil menunggu.
  float temperature = read_temperature_c();
  float ph          = read_ph();
  float tds         = read_tds_ppm(temperature); // memerlukan suhu untuk kompensasi
  int battery_mv    = read_battery_mv();

  // --- 4. Klasifikasi kualitas air (mirror shared/thresholds.json) ---
  Thresholds thresholds; // lower-inclusive / upper-exclusive, pH keduanya inklusif
  Classification cls = classify(ph, tds, thresholds);
  unsigned reasons   = alert_reasons(ph, tds, thresholds);

  // --- 5. Koneksi (WiFi + NTP + MQTT TLS dengan CA tertancap) ---
  bool connected = false;
  bool wifi_ok = false;
  if (!watchdog_expired(start_ms)) {
    wifi_ok = net_connect_wifi();
    if (wifi_ok) connected = net_mqtt_connect();
  }

  // WiFi gagal -> tawarkan captive portal agar user bisa ganti jaringan.
  if (!wifi_ok && !watchdog_expired(start_ms)) {
    Serial.println(F("WiFi tidak terhubung -> captive portal"));
    if (wifi_mgr_start_portal(kPortalTimeoutMs)) {
      Serial.println(F("Kredensial tersimpan, restart..."));
      g_wifi_channel = 0;
      g_wifi_bssid[0] = 0;
      g_last_ntp_sync = 0;
      ESP.restart();
    }
    Serial.println(F("Portal timeout -> tidur"));
    enter_sleep(static_cast<uint32_t>(millis() - start_ms));
    return;
  }

  if (!connected) {
    Serial.println(F("koneksi jaringan gagal/lewati (watchdog)"));
    enter_sleep(static_cast<uint32_t>(millis() - start_ms));
    return;
  }

  // --- 6. Publish telemetry (QoS 0, retain=true) ---
  uint32_t ts   = g_last_ntp_sync; // 0 jika NTP gagal (dashboard capai pada terima)
  int rssi      = WiFi.RSSI();
  uint32_t active_time_ms = static_cast<uint32_t>(millis() - start_ms);

  {
    StaticJsonDocument<1024> doc;
    if (build_telemetry(doc, DEVICE_ID, ts, g_seq, temperature,
                        ph, tds, cls.status, active_time_ms, rssi,
                        FW_VERSION, battery_mv, true)) {
      if (!watchdog_expired(start_ms)) {
        net_publish_telemetry(doc);
      }
    }
  }

  // --- 7. Publish alert (QoS 1, tunggu PUBACK sebelum tidur) ---
  if (reasons != 0 && !watchdog_expired(start_ms)) {
    const char* reason_strs[2];
    size_t n = 0;
    if (reasons & ALERT_PH_OUT_OF_RANGE)  reason_strs[n++] = "PH_OUT_OF_RANGE";
    if (reasons & ALERT_TDS_GT_MAX)       reason_strs[n++] = "TDS_GT_MAX";

    StaticJsonDocument<256> alert_doc;
    if (build_alert(alert_doc, DEVICE_ID, ts, reason_strs, n)) {
      net_publish_alert(alert_doc);
      // Tunggu PUBACK (QoS 1) sebelum disconnect dan deep sleep.
      unsigned long puback_start = millis();
      while (net_is_connected() && (millis() - puback_start) < kPubackWaitMs) {
        net_mqtt_loop();
        delay(50);
      }
    }
  }

  // --- 8. Disconnect, matikan daya sensor, tidur ---
  enter_sleep(static_cast<uint32_t>(millis() - start_ms));
}

void loop() {
  // Tidak terpakai: setup() selalu berakhir dengan esp_deep_sleep_start().
  // Chip merestart dan menjalankan setup() lagi pada tiap kebangunannya.
}
