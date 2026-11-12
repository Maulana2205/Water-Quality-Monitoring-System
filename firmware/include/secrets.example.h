#ifndef SECRETS_H
#define SECRETS_H

/* Copy this file to secrets.h (gitignored) and fill in real values.
 * Never commit real WiFi / MQTT credentials. */

#define WIFI_SSID             "YOUR_WIFI_SSID"
#define WIFI_PASSWORD         "YOUR_WIFI_PASSWORD"

#define MQTT_HOST             "YOUR_BROKER_HOST.mqtt.emqx.io"
#define MQTT_PORT             8883
#define MQTT_USERNAME         "device_esp32_01"
#define MQTT_PASSWORD         "YOUR_DEVICE_PASSWORD"
#define MQTT_CLIENT_ID        "esp32_water_01"

#define DEVICE_ID             "esp32_water_01"
#define FW_VERSION            "0.2.0"

#endif
