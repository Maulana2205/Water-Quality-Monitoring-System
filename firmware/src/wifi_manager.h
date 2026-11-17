#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>

/**
 * WiFiManager ringkas: captive portal (AP + DNS + WebServer) untuk memilih SSID
 * dan menyimpan kredensial ke NVS (Preferences). Hanya library bawaan framework
 * ESP32 (WebServer, DNSServer, Preferences) — tanpa dependency baru.
 *
 * Alur: jika belum ada kredensial, atau WiFi gagal konek, main() memanggil
 * wifi_mgr_start_portal(). Setelah kredensial tersimpan, main() restart.
 */

/** Simpan kredensial WiFi ke NVS. */
void wifi_mgr_save(const String& ssid, const String& password);

/** Ada kredensial tersimpan di NVS? */
bool wifi_mgr_have_credentials(void);

/** Ambil kredensial tersimpan. ssid kosong jika belum ada. */
void wifi_mgr_get(String& ssid, String& password);

/**
 * Jalankan captive portal (AP SSID "WaterQuality-Setup").
 * Blocking sampai kredensial disimpan atau timeout.
 * Kembalikan true jika kredensial baru disimpan.
 */
bool wifi_mgr_start_portal(unsigned long timeout_ms);

#endif