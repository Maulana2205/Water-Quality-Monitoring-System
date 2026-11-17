#include "net.h"

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <MQTT.h>
#include <time.h>

#include "../lib/water_logic/payload.h"

#include "secrets.h"
#include "wifi_manager.h"

// Pinned broker CA certificate — download from EMQX Cloud console and paste here.
// Never call setInsecure(). Empty => MQTT connect refused (fail-safe).
static const char kCaCert[] = R"EOF(-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMWLSn/pvtsrF9+wX3N3KjITOYFnQoQj8kVnNeyIv/iPsGEMNKSuIEyExtv4
NeF22d+mQrvHRAiGfzZ0JFrabA0UWTW98kndth/Jsw1HKj2ZL7tcu7XUIOGZX1NG
Fdtom/DzMNU+MeKNhJ7jitralj41E6Vf8PlwUHBHQRFXGU7Aj64GxJUTFy8bJZ91
8rGOmaFvE7FBcf6IKshPECBV1/MUReXgRPTqh5Uykw7+U0b6LJ3/iyK5S9kJRaTe
pLiaWN0bfVKfjllDiIGknibVb63dDcY3fe0Dkhvld1927jyNxF1WW6LZZm6zNTfl
MrY=
-----END CERTIFICATE-----
)EOF";

// lwmqtt (256dpi/MQTT) publish for QoS 1 blocks until PUBACK or internal timeout.
static WiFiClientSecure s_wifiClient;
static MQTTClient s_mqttClient;

static uint32_t s_last_ts = 0;

bool net_connect_wifi(void) {
  String ssid, password;
  wifi_mgr_get(ssid, password);
  if (ssid.isEmpty()) return false; // belum dikonfigurasi

  WiFi.mode(WIFI_STA);
  if (g_wifi_channel != 0) {
    WiFi.begin(ssid.c_str(), password.c_str(), g_wifi_channel, g_wifi_bssid);
  } else {
    WiFi.begin(ssid.c_str(), password.c_str());
  }

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > kWifiTimeoutMs) {
      WiFi.disconnect();
      return false;
    }
    delay(100);
  }

  // Cache channel/BSSID for next wake.
  g_wifi_channel = WiFi.channel();
  WiFi.BSSID(g_wifi_bssid);

  // NTP sync (store success in RTC); best effort, non-fatal.
  configTime(0, 0, "pool.ntp.org");
  time_t now = 0;
  unsigned long ntp_start = millis();
  while (now < 100000UL && millis() - ntp_start < 5000UL) {
    delay(100);
    now = time(nullptr);
  }
  if (now >= 100000UL) {
    s_last_ts = static_cast<uint32_t>(now);
    g_last_ntp_sync = s_last_ts;
  }
  return true;
}

bool net_mqtt_connect(void) {
  if (kCaCert[0] == '\0') {
    // Fail-safe: no pinned CA => do not connect insecurely.
    return false;
  }
  s_wifiClient.setCACert(kCaCert);
  s_mqttClient.begin(MQTT_HOST, MQTT_PORT, s_wifiClient);

  unsigned long start = millis();
  while (!s_mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    if (millis() - start > kMqttTimeoutMs) {
      return false;
    }
    delay(100);
  }
  return true;
}

static String serialize_doc(ArduinoJson::JsonDocument& doc) {
  String out;
  serializeJson(doc, out);
  return out;
}

bool net_publish_telemetry(ArduinoJson::JsonDocument& doc) {
  if (!s_mqttClient.connected()) return false;
  String topic = String("water_quality/") + DEVICE_ID + "/telemetry";
  String payload = serialize_doc(doc);
  // QoS 0, retain=true.
  return s_mqttClient.publish(topic.c_str(), payload.c_str(),
                              kQosTelemetry, kRetainTelemetry, false);
}

bool net_publish_alert(ArduinoJson::JsonDocument& doc) {
  if (!s_mqttClient.connected()) return false;
  String topic = String("water_quality/") + DEVICE_ID + "/alert";
  String payload = serialize_doc(doc);
  // QoS 1: lwmqtt blocks until PUBACK (or internal timeout).
  return s_mqttClient.publish(topic.c_str(), payload.c_str(),
                              kQosAlert, kRetainAlert, false);
}

void net_disconnect(void) {
  s_mqttClient.disconnect();
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
}

bool net_is_connected(void) {
  return s_mqttClient.connected();
}

void net_mqtt_loop(void) {
  s_mqttClient.loop();
}
