#include "wifi_manager.h"

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

static Preferences s_prefs;
static const char* kNamespace = "wifi";
static const char* kApSsid    = "WaterQuality-Setup";

void wifi_mgr_save(const String& ssid, const String& password) {
  s_prefs.begin(kNamespace, false); // read-write
  s_prefs.putString("ssid", ssid);
  s_prefs.putString("pass", password);
  s_prefs.end();
}

bool wifi_mgr_have_credentials(void) {
  if (!s_prefs.begin(kNamespace, true)) return false; // read-only
  String ssid = s_prefs.getString("ssid", "");
  s_prefs.end();
  return ssid.length() > 0;
}

void wifi_mgr_get(String& ssid, String& password) {
  ssid = "";
  password = "";
  if (!s_prefs.begin(kNamespace, true)) return; // read-only
  ssid = s_prefs.getString("ssid", "");
  password = s_prefs.getString("pass", "");
  s_prefs.end();
}

// ponytail: captive portal blocking. Ganti dengan async (WebServer + timer)
// jika butuh mode config non-blocking di siklus normal.
bool wifi_mgr_start_portal(unsigned long timeout_ms) {
  WiFi.mode(WIFI_AP_STA); // AP + STA (STA untuk scan)
  WiFi.softAP(kApSsid);
  const IPAddress apIP = WiFi.softAPIP(); // default 192.168.4.1

  DNSServer dns;
  dns.start(53, "*", apIP); // redirect semua DNS -> AP

  WebServer server(80);
  bool saved = false;

  static const char kHtml[] PROGMEM = R"HTML(<!doctype html><html lang="id"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup WiFi Air</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:1.5rem;background:#0f172a;color:#e2e8f0}
.card{max-width:420px;margin:0 auto;background:#1e293b;border-radius:12px;padding:1.25rem}
h1{font-size:1.1rem;margin:0 0 1rem}label{display:block;font-size:.8rem;color:#94a3b8;margin:.75rem 0 .25rem}
select,input,button{width:100%;padding:.6rem;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:1rem}
button{margin-top:1rem;background:#10b981;border:0;font-weight:600;cursor:pointer}
#status{margin-top:.75rem;font-size:.85rem;color:#94a3b8}
</style></head><body><div class="card">
<h1>Setup WiFi Air</h1>
<form id="f" method="POST" action="/save">
<label for="ssid">Jaringan WiFi</label>
<select id="ssid" name="ssid" required></select>
<label for="pass">Password</label>
<input id="pass" name="pass" type="password" autocomplete="off">
<button type="submit">Simpan &amp; Hubungkan</button>
</form>
<p id="status">Memindai jaringan...</p>
</div>
<script>
fetch('/scan').then(function(r){return r.json()}).then(function(n){
  n.sort(function(a,b){return b.rssi-a.rssi});
  var s=document.getElementById('ssid');
  for(var i=0;i<n.length;i++){var o=document.createElement('option');
    o.value=n[i].ssid;o.textContent=n[i].ssid+' ('+n[i].rssi+' dBm)';s.appendChild(o);}
  document.getElementById('status').textContent='Pilih jaringan lalu masukkan password.';
}).catch(function(){document.getElementById('status').textContent='Gagal memindai.';});
</script></body></html>)HTML";

  server.on("/", HTTP_GET, [&]() {
    server.send_P(200, "text/html", kHtml);
  });

  server.on("/scan", HTTP_GET, [&]() {
    int n = WiFi.scanNetworks();
    String json = "[";
    for (int i = 0; i < n; ++i) {
      if (i) json += ",";
      json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
    }
    json += "]";
    server.send(200, "application/json", json);
    WiFi.scanDelete();
  });

  server.on("/save", HTTP_POST, [&]() {
    String ssid = server.arg("ssid");
    String pass = server.arg("pass");
    if (ssid.isEmpty()) {
      server.send(400, "text/plain", "SSID kosong");
      return;
    }
    wifi_mgr_save(ssid, pass);
    saved = true;
    server.send(200, "text/html",
                "<h1>Tersimpan. Perangkat akan restart...</h1>");
  });

  // Captive-portal detection (Android/iOS/Windows) selalu diarahkan ke "/".
  server.onNotFound([&]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });

  server.begin();
  Serial.print(F("captive portal di http://"));
  Serial.println(apIP);

  unsigned long start = millis();
  while (millis() - start < timeout_ms && !saved) {
    dns.processNextRequest();
    server.handleClient();
    delay(2);
  }

  server.stop();
  dns.stop();
  WiFi.mode(WIFI_OFF);
  return saved;
}