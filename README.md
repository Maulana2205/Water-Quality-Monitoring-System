# Water Quality Monitoring System

Sistem monitoring kualitas air berbasis IoT: ESP32 mengukur **suhu, pH, dan TDS**, mengirim data ke broker MQTT EMQX Cloud, lalu dashboard React menampilkannya secara real-time. Status air diklasifikasikan menjadi **layak konsumsi**, **layak cuci/mandi**, atau **tidak layak**.

Dokumen ini merangkum tech stack, struktur projek, fungsionalitas, wiring, dan cara menjalankan sistem. Aturan kerja agen ada di `AGENTS.md`.

---

## Fungsional

### Firmware (ESP32)
- Mengambil sampel ADC (11 dB, `analogReadMilliVolts()`) untuk pH & TDS dan suhu dari DS18B20 (OneWire).
- Median filter 30 sampel per sensor untuk membuang spike.
- Konversi tegangan → pH (kalibrasi 2 titik) dan TDS (kompensasi suhu).
- Klasifikasi status + alert rule dari `shared/thresholds.json` (satu sumber kebenaran, dipakai firmware & web).
- Koneksi WiFi + captive portal: jika belum ada kredensial, ESP32 membuka hotspot untuk memilih SSID & password dari HP; kredensial disimpan di NVS.
- MQTT over TLS dengan CA certificate pinning (tanpa `setInsecure()`).
  - Telemetry: topik `water_quality/<device_id>/telemetry`, **QoS 0, retained**.
  - Alert: topik `water_quality/<device_id>/alert`, **QoS 1**, tunggu PUBACK sebelum tidur.
- Sensor dimatikan lewat **MOSFET gate GPIO26**, lalu `esp_deep_sleep_start()` selama 30 menit.
- Watchdog: jika active window > 30 s, publish dilewati dan perangkat tetap tidur.
- `seq` (boot counter), cache WiFi channel/BSSID, dan waktu NTP terakhir disimpan di `RTC_DATA_ATTR`.
- Mode kalibrasi (`pio run -e calibration -t upload`) mencetak tegangan ADC mentah tiap 1 detik tanpa WiFi/deep sleep.

### Web dashboard
- Koneksi WSS ke broker, subscribe topik **exact** telemetry + `water_quality/+/alert` dengan kredensial **read-only**.
- Setiap payload divalidasi dengan `zod`; pesan invalid dibuang dan dihitung.
- Status perangkat `online` / `stale` / `offline` dihitung dari waktu sejak `ts` (bukan dari status koneksi MQTT, karena perangkat memang tidur).
- Kartu sensor (suhu, pH, TDS) dengan warna status, badge status overall berbahasa Indonesia, dan banner alert QoS 1.
- Grafik riwayat 24 jam (Recharts) dengan rentang 1/6/12/24 jam.
- Riwayat 48 poin terakhir disimpan di `localStorage` sebagai ring buffer; data corrupt ditangani tanpa crash.
- Panel keberlanjutan: active window, duty cycle, estimasi energi/hari, dan estimasi umur baterai (angka masih **perkiraan**, placeholder `P_sleep`).
- Responsif (mobile-first), mode terang/gelap, favicon & logo bertema air.

### Simulator
- `tools/simulate_device.mjs <scenario>` mem-publish telemetry palsu (normal, high TDS, bad pH, missed cycle, malformed) untuk mencoba dashboard tanpa hardware.

---

## Tech stack

| Layer | Pilihan |
|-------|---------|
| Firmware build | PlatformIO, `espressif32`, Arduino framework |
| MQTT ESP32 | `256dpi/MQTT` + `WiFiClientSecure` (mendukung QoS 1 & retain; **bukan** PubSubClient) |
| JSON firmware | `bblanchon/ArduinoJson @ ^7` |
| Sensor | `OneWire` + `DallasTemperature` |
| Logika firmware | C++17 murni di `lib/water_logic` (tanpa `Arduino.h`), dapat ditest di host |
| Test firmware | Unity via `pio test -e native` (butuh compiler C++ host, mis. `g++`) |
| Frontend | Vite + React + TypeScript (`strict`) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (tanpa `tailwind.config.js`) |
| Chart | Recharts |
| MQTT web | `mqtt` (mqtt.js) over WSS `:8084/mqtt` |
| Validasi | `zod` |
| Test web | Vitest + React Testing Library + jsdom |
| Broker | EMQX Cloud Serverless (region Southeast Asia) |
| Deploy web | Netlify (static build dari `web-dashboard/`) |

---

## Struktur projek

```
.
├── AGENTS.md                    # aturan kerja agen
├── README.md                    # dokumentasi ini
├── shared/                      # kontrak firmware ↔ web
│   ├── thresholds.json          # ambang klasifikasi (sumber kebenaran tunggal)
│   ├── telemetry.schema.json    # JSON Schema payload
│   └── fixtures/               # contoh payload untuk kedua test suite
├── firmware/
│   ├── platformio.ini           # env: esp32dev, native, calibration
│   ├── include/
│   │   ├── secrets.example.h    # template (copy -> secrets.h, gitignored)
│   │   └── secrets.h            # kredensial asli (gitignored)
│   ├── lib/
│   │   └── water_logic/         # PURE C++: median_filter, sensor_math, classifier, payload
│   ├── src/                     # hardware layer: ADC, DS18B20, WiFi, MQTT, deep sleep
│   │   ├── main.cpp
│   │   ├── hal_sensors.{h,cpp}
│   │   ├── net.{h,cpp}
│   │   └── wifi_manager.{h,cpp}
│   └── test/test_native/        # Unity test, dijalankan di PC
├── web-dashboard/
│   ├── .env.example             # template env (gitignored: .env)
│   ├── vite.config.ts           # juga berisi konfigurasi Vitest
│   ├── public/favicon.svg
│   └── src/
│       ├── App.tsx
│       ├── components/          # SensorCard, QualityStatusBadge, HistoricalChart,
│       │                        # DeviceStatus, SustainabilityPanel
│       ├── hooks/useTelemetry.ts
│       ├── services/mqttClient.ts
│       ├── lib/                 # parseTelemetry, classify, history, staleness
│       └── __tests__/           # Vitest + React Testing Library
└── tools/
    ├── .env.example
    └── simulate_device.mjs      # simulator telemetry
```

---

## Kontrak data

### Telemetry — `water_quality/<device_id>/telemetry` (QoS 0, retain=true)

```json
{
  "device_id": "esp32_water_01",
  "ts": 1767225600,
  "seq": 128,
  "temperature": 27.5,
  "ph": 7.2,
  "tds_ppm": 145.0,
  "status": "DRINKABLE",
  "active_time_ms": 18400,
  "rssi": -61,
  "fw": "0.2.0"
}
```

`status` adalah enum: `DRINKABLE`, `HYGIENE_OK`, `UNFIT`. Label bahasa Indonesia hanya ada di UI. Sesuai Permenkes 2/2023, firmware **hanya menghasilkan `DRINKABLE` atau `UNFIT`**; `HYGIENE_OK` dipertahankan di skema hanya untuk kompatibilitas payload lama.

### Alert — `water_quality/<device_id>/alert` (QoS 1, retain=false)

```json
{
  "device_id": "esp32_water_01",
  "ts": 1767225600,
  "reasons": ["PH_OUT_OF_RANGE"],
  "values": { "ph": 9.1 }
}
```

### Ambang batas (`shared/thresholds.json`)

Berdasarkan **Permenkes No. 2 Tahun 2023**, Tabel 1 (Air Minum) dan Tabel 3 (Air Higiene & Sanitasi):

| Parameter | DRINKABLE (`LAYAK`) | HYGIENE_OK (legacy) | UNFIT |
|-----------|---------------------|---------------------|-------|
| pH | 6,5 – 8,5 | 6,5 – 8,5 | di luar rentang |
| TDS (ppm) | < 300 | < 300 | ≥ 300 |
| Suhu | udara ± 3 °C | — | — |

Batas bawah inklusif, batas atas eksklusif, kecuali pH yang keduanya inklusif. Alert dipicu jika pH di luar `[6,5, 8,5]` atau **TDS ≥ 300 ppm**.

Catatan penting: Permenkes 2/2023 menetapkan **batas fisik-kimia yang identik** untuk air minum dan air higiene (pH 6,5–8,5; TDS < 300 mg/L; suhu udara ± 3 °C; kekeruhan < 3 NTU; warna 10 TCU; tidak berbau; E. coli dan Coliform 0 CFU/100 mL). Pasal 51 peraturan ini mencabut Permenkes 32/2017 — sumber angka TDS `< 1000` yang sebelumnya dipakai proyek. Karena sensor kita hanya mengukur pH, TDS, dan suhu, sistem **tidak dapat menilai parameter mikrobiologi atau persyaratan higiene penanganan**; status `LAYAK` hanya berarti **layak secara fisik-kimia**. Label UI ditandai tooltip untuk menjelaskan hal ini.

---

## Wiring ringkas

| Fungsi | GPIO | Komponen | Catatan |
|--------|------|----------|---------|
| OneWire Data | GPIO4 | DS18B20 DATA | Pull-up 4,7 kΩ ke 3V3 |
| pH Signal | GPIO35 | pH 4502C Po | Pembagi 10k/20k; `DIV_PH = 1,5` di kode |
| TDS Signal | GPIO32 | TDS v1.0 Analog Out | Tanpa pembagi |
| Baterai (opsional) | GPIO33 | Pembagi baterai | — |
| Sensor gate | GPIO26 | MOSFET / load switch | Digital output, nyalakan/matikan daya sensor |

- Gunakan **ADC1 only** (GPIO32, 33, 35) untuk analog; jangan pakai ADC2 saat WiFi aktif.
- pH 4502C butuh **5 V**; TDS v1.0 dan DS18B20 pakai **3V3**. Ground harus bersama.
- Gate GPIO26: HIGH → sensor menyala (warm-up ≈ 2 s), LOW → mati sebelum deep sleep. Pakai MOSFET logic-level (mis. IRLZ44N) dengan pull-down 10 kΩ.
- Rentang linier ADC ESP32 pada 11 dB ≈ 150–2450 mV; tegangan di atas itu tidak andal.

---

## Menjalankan

| Task | Directory | Command |
|------|-----------|---------|
| Test firmware (host) | `firmware/` | `pio test -e native` |
| Build firmware | `firmware/` | `pio run -e esp32dev` |
| Build mode kalibrasi | `firmware/` | `pio run -e calibration` |
| Flash & monitor (**user only**) | `firmware/` | `pio run -t upload` / `pio device monitor` |
| Install dependency web | `web-dashboard/` | `npm install` |
| Dev server | `web-dashboard/` | `npm run dev` |
| Test web | `web-dashboard/` | `npx vitest run` |
| Typecheck / build | `web-dashboard/` | `npx tsc --noEmit` / `npm run build` |
| Simulator | repo root | `node tools/simulate_device.mjs <scenario>` |

Jika `pio test -e native` gagal karena tidak ada `g++`, install compiler host C++ terlebih dahulu — jangan melewati test.

---

## Konfigurasi

Salin template lalu isi nilai asli (file aslinya gitignored, **jangan pernah** di-commit):

- `firmware/include/secrets.example.h` → `firmware/include/secrets.h`: WiFi & kredensial device MQTT.
- `web-dashboard/.env.example` → `web-dashboard/.env`:
  - `VITE_MQTT_BROKER_URL` — endpoint WSS broker (`:8084/mqtt`)
  - `VITE_DEVICE_ID`
  - `VITE_MQTT_USER`, `VITE_MQTT_PASS` — **kredensial read-only** (`dashboard_ro`)
- `tools/.env.example` → `tools/.env` untuk simulator.

ACL broker: device hanya boleh publish di topik perangkatnya; dashboard hanya boleh subscribe. Karena env `VITE_*` ikut ter-bundle, kredensial web wajib read-only.

Untuk Netlify, set kelima env di atas di panel site environment variables, lalu deploy dari `web-dashboard/`.

---

## Anggaran waktu & energi

| Tahap | Estimasi |
|-------|----------|
| Boot + init | 0,3 s |
| Warm-up + sampling (30 sampel per sensor) | 3–5 s |
| WiFi connect (cache channel/BSSID) | 2–5 s |
| NTP + TLS + MQTT connect | 3–5 s |
| Publish + flush / PUBACK | 0,5–1 s |
| **Total** | **≈ 10–17 s** |

Target active window ≤ 20 s per siklus, lalu deep sleep 30 menit (48 siklus/hari). Hasil ukur 50 siklus: mean **10,94 s**, p50 10,70 s, p95 **13,68 s**, max 14,20 s — masih di bawah target. Watchdog memotong siklus jika active window melewati 30 s.

Rumus estimasi: `E_day = 48 × (P_active × t_active) + P_sleep × (24 jam − 48 × t_active)`.

Konstanta placeholder di `SustainabilityPanel.tsx`: `VOLTAGE_V=3,7`, `ACTIVE_MA=120`, `SLEEP_MA=15`, `CAPACITY_MAH=3000`, `CYCLE_S=1800`. Angka energi dan umur baterai **belum** berdasarkan pengukuran `P_sleep` aktual dan perlu diperbarui setelah pengukuran.

## Status & catatan terkini

- Build & test hijau: `pio run -e esp32dev` SUCCESS, `pio run -e calibration` SUCCESS, `pio test -e native` 25/25 PASSED; web `tsc` lolos, 90/90 Vitest PASSED, `npm run lint` tanpa warning, `npm run build` sukses.
- Bug urutan argumen `publish()` 256dpi/MQTT sudah diperbaiki (`publish(topic, payload, retained, qos)`) — sebelumnya payload terkirim kosong.
- Quirk broker EMQX yang dipakai: wildcard multi-level `#` tidak me-route retained, tetapi `+` dan topik exact normal. Dashboard sudah memakai topik exact + `water_quality/+/alert`.
- Angka energi & umur baterai di dashboard masih **perkiraan** (belum ada pengukuran `P_sleep` aktual).
- **Kalibrasi sensor sudah diterapkan (2026-11-22):** `V_PH7 = 2.852 V`, `V_PH4 = 3.030 V` (slope 59,3 mV/pH — dekat Nernst ideal), `V_TDS0 = 0.2531 V`, `TDS_K = 1.0`. Konstanta di `hal_sensors.h` dan baseline TDS di `sensor_math.cpp` sudah disesuaikan; probe kini stabil. `TDS_K` masih default 1,0 karena belum dikalibrasi span dengan larutan standar (mis. 342 ppm) — jalankan `t 342` di sketch kalibrasi jika ingin akurasi lebih baik.
- Sensor kekeruhan (SEN0189 / NTU) sudah dihapus dari seluruh stack.
- **Klasifikasi diselaraskan dengan Permenkes 2/2023 (2026-11-21):** TDS `hygiene_ok` diturunkan dari `< 1000` ke `< 300 ppm`, alert TDS kini ≥ 300 ppm, dan status `LAYAK` / `TIDAK LAYAK` (dua kategori fisik-kimia). `HYGIENE_OK` tetap ada di enum payload untuk kompatibilitas data lama tetapi tidak pernah dihasilkan klasifikasi baru. Sumber: `AturanPermenkesKlasifikasiAir.md` di root repo.
- Sketch `kalibrasi_sensor_air_esp32/kalibrasi_sensor_air_esp32.ino` tetap disimpan sebagai sumber prosedur kalibrasi (perintah `p7`, `p4`, `t0`, `t <ppm>`, `k`). Firmware normal sudah memakai nilai hasil kalibrasinya.
- **Audit web dashboard (2026-11-22):** status perangkat kini dihitung ulang tiap detik dari `ts` (tidak mandek di `ONLINE` saat board tidur); alert divalidasi zod, difilter per `deviceId`, tidak duplikat, dan diganti tiap siklus; riwayat melakukan dedup by `ts` dan re-validasi localStorage saat hydrate; garis ambang grafik sepenuhnya dari `thresholds.json` (garis "TDS 1000" yang usang dihapus); tiap kartu sensor memakai status parameter sendiri, bukan status global. Suhu sengaja **tidak** diklasifikasikan (opsi C) — hanya untuk kompensasi TDS.
- **Grafik riwayat (2026-11-22):** XAxis numerik memakai domain rentang timestamp aktual (`timeDomain`) — bukan default Recharts `[0, 'auto']` yang membuat titik epoch menumpuk di ujung kanan. Grafik **dipisah per sensor** (Suhu, pH, TDS), masing-masing dengan sumbu Y dan garis ambang sendiri (pH 6,5/8,5; TDS 300; suhu tanpa ambang). Setiap sumbu diberi label (Suhu °C, pH, TDS ppm; sumbu waktu "Waktu (WIB)"). Garis memakai tipe `linear` (lekukan tajam), bukan `monotone` yang bergelombang. Tooltip hanya menampilkan satu nilai. Rentang 1/6/12/24 jam berlaku untuk ketiga grafik.
- **Panel kelayakan guna (2026-11-22):** UI menampilkan tiga label penggunaan — **konsumsi, mandi, cuci baju** — dengan status layak/tidak layak. Ketiganya memakai **satu ambang fisik-kimia Permenkes 2/2023 yang sama** (pH 6,5–8,5; TDS < 300 ppm), karena peraturan tidak membedakan batas antar guna dan kategori Air Minum sudah mencakup mandi/cuci bahan pangan. Tidak ada ambang buatan yang diklaim sebagai Permenkes. Parameter mikrobiologi tidak diukur sensor.
