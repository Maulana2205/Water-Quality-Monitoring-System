#ifndef NET_H
#define NET_H

#include <ArduinoJson.h>
#include "classifier.h"

/// Per-cycle state kept across deep sleep (defined in main.cpp, RTC_DATA_ATTR).
extern uint32_t g_seq;
extern uint8_t g_wifi_channel;
extern uint8_t g_wifi_bssid[6];
extern uint32_t g_last_ntp_sync;

// MQTT QoS / retain per contract:
// telemetry: QoS 0, retain=true  |  alert: QoS 1, retain=false
constexpr int kQosTelemetry = 0;
constexpr bool kRetainTelemetry = true;
constexpr int kQosAlert = 1;
constexpr bool kRetainAlert = false;

// WiFi connect timeout (ms) within the 30 s active-window budget.
constexpr unsigned long kWifiTimeoutMs = 10000UL;
// MQTT connect / publish timeout (ms).
constexpr unsigned long kMqttTimeoutMs = 10000UL;

/** WiFi connect (cached channel/BSSID for faster reconnect). Kembalikan false jika timeout. */
bool net_connect_wifi(void);

/** MQTT over TLS with pinned CA certificate. Kembalikan false jika gagal. */
bool net_mqtt_connect(void);

/** Publish telemetry (QoS 0, retain=true). */
bool net_publish_telemetry(ArduinoJson::JsonDocument& doc);

/** Publish alert (QoS 1, waits for PUBACK). */
bool net_publish_alert(ArduinoJson::JsonDocument& doc);

/** Disconnect MQTT + WiFi cleanly. */
void net_disconnect(void);

/** Terkoneksi ke broker saat ini? */
bool net_is_connected(void);

/** Jalankan loop MQTT (proses PUBACK, keepalive, dll). */
void net_mqtt_loop(void);

#endif
