# Wiring — IoT Water Quality Monitoring System (ESP32)

Rangkaian lengkap ESP32 Dev Module + sensor kualitas air, setelah sensor kekeruhan (turbidity/NTU/SEN0189) dihapus.

## Aturan umum
* **ADC1 pins only** (GPIO32, 33, 35). Jangan gunakan ADC2 saat WiFi aktif.
* Baca ADC dengan `analogReadMilliVolts()` pada attenuasi **11 dB** (≈ 0–3300 mV, eFuse calibrated).
* Tegangan pembagi diterapkan di **kode** (`DIV_PH = 1.5` di `sensor_math.cpp`), bukan di hardware raw output.
* Semua sensor daya diturunkan via **gate pin GPIO23** sebelum `esp_deep_sleep_start()`.

## Pinout ESP32 Dev Module

| Fungsi | GPIO | Pin | Komponen | Keterangan |
|--------|------|-----|----------|------------|
| OneWire Data | GPIO4 | D4 | DS18B20 DATA | Pull-up 4.7 kΩ ke 3V3 |
| pH Signal | GPIO35 | D35 | pH 4502C Po | Via pembagi 10k/20k, V+ 5V |
| TDS Signal | GPIO32 | D32 | TDS v1.0 Analog Out | Tanpa pembagi |
| Baterai (opsional) | GPIO33 | D33 | Pembagi baterai | Hanya jika `has_battery = true` |
| Sensor Gate | GPIO23 | D23 | Load switch / MOSFET | OUTPUT, nyalakan/matikan daya sensor |

## Koneksi per Sensor

### A. DS18B20 — Suhu Air (OneWire)
```
ESP32       DS18B20
─────────────────────
3V3  ─────── VCC (merah)
GND  ─────── GND (hitam)
GPIO4 ────── DATA (kuning)
                 │
                 └─ pull-up 4.7 kΩ antara DATA dan 3V3
```

### B. pH 4502C — via Pembagi Tegangan 10k/20k
```
ESP32       Pembagi       pH 4502C
──────────────────────────────────
5V   ─────── V+           V+ (5V)
GND  ─────── GND           GND
GPIO35 ───── Po           Po (via 10k/20k divider)
```
*Catatan: `DIV_PH = 1.5` diterapkan di kode, bukan di hardware raw output.*

### C. TDS Meter v1.0 — Langsung ke ADC
```
ESP32       TDS v1.0
──────────────────────
3V3  ─────── VCC
GND  ─────── GND
GPIO32 ───── A (Analog Out)
```
*Tidak ada pembagi tegangan (TDS v1.0 output 0–2.3 V).*

### D. Pembagi Baterai (Opsional, GPIO33)
```
ESP32       Pembagi       Baterai
──────────────────────────────────
GPIO33 ───── titik center   +
GND  ─────── GND            −
```

### E. Sensor Power Gate (GPIO23)
```
ESP32       Gate/MOSFET     VCC sensor board
─────────────────────────────────────────────
GPIO23 ───── Gate           5V / 3V3 (ke sensor pH & TDS)
GND  ─────── Source         GND
```
*Dinyalakan sebelum sampling (`sensors_power_on()`, warm-up ≈ 2 s), dimatikan sebelum deep sleep.*

## Rangkaian Listrik (Power Rails)

```
ESP32 Dev Module
├─ 3V3  ───────────────────┬─ DS18B20 VCC
│                          ├─ TDS VCC
│                          └─ (via gate) pH/TDS sensor boards
├─ 5V   ───────────────────┬─ pH 4502C V+
│                          └─ (via gate) sensor boards yang butuh 5V
├─ GND  ───────────────────┬─ Semua GND sensor
│                          └─ Baterai −
├─ GPIO4 ──────── DS18B20 DATA (dengan pull-up 4.7 kΩ)
├─ GPIO32 ───── TDS Analog Out
├─ GPIO33 ───── Baterai (opsional)
├─ GPIO35 ───── pH Po (via divider)
└─ GPIO23 ───── Sensor Gate (load switch/MOSFET)
```

## Perhatian Hardware

1. **Tegangan sensor:** pH 4502C butuh 5V (`V+`), TDS v1.0 dan DS18B20 pakai 3V3. Jangan terbalik.
2. **ADC1 only:** GPIO32, 33, 35 adalah ADC1 — aman dipakai sambil WiFi aktif. Jangan gunakan GPIO25/26 (ADC2) saat WiFi on.
3. **Attenuasi 11 dB:** Rentang baca ~0–3300 mV, gunakan eFuse calibration via `analogReadMilliVolts()`.
4. **Pembagi kode, tidak hardware:** `DIV_PH = 1.5` diterapkan di `sensor_math.cpp`, tidak di rangkaian fisik.
5. **Power gating:** Nyalakan sensor gate 2 s (warm-up) sebelum sampling, matikan sebelum `esp_deep_sleep_start()` untuk hemat daya tidur.
6. **Pull-up DS18B20:** Wajib 4.7 kΩ antara DATA dan 3V3, otherwise OneWire tidak akan detect sensor.

## Ringkasan Sensor Aktif

| Sensor | GPIO | VCC | GND | Catatan |
|--------|------|-----|-----|---------|
| DS18B20 | GPIO4 | 3V3 | GND | Pull-up 4.7 kΩ |
| pH 4502C | GPIO35 | 5V | GND | Via pembagi 10k/20k, DIV_PH=1.5 di kode |
| TDS v1.0 | GPIO32 | 3V3 | GND | Tanpa pembagi |
| Baterai (opt) | GPIO33 | — | GND | Pembagi baterai |
| Gate | GPIO23 | — | — | Load switch/MOSFET |

Sensor **SEN0189 (keringauh/NTU)** pada GPIO34 **tidak dipakai lagi** dan sudah dihapus dari kode serta dokumentasi ini.