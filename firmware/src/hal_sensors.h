#ifndef HAL_SENSORS_H
#define HAL_SENSORS_H

#include <cstddef>

/// Pin mapping (ADC1 only — safe to use while WiFi is active).
constexpr int kPinDs18b20 = 4;       // DS18B20 DATA (OneWire)
constexpr int kPinPh = 35;           // pH 4502C Po via 10k/20k divider -> ADC1
constexpr int kPinTds = 32;          // TDS v1.0 analog out -> ADC1 (no divider)
constexpr int kPinBattery = 33;      // optional battery divider -> ADC1

/// Sensor power-gate GPIO (load switch / MOSFET). Sesuaikan dengan wiring fisik.
constexpr int kPinSensorGate = 26;

/// Jumlah sampel median filter per sensor per siklus.
constexpr int kSamplesPerSensor = 30;

/// pH two-point calibration: (pH value, voltage mV) pairs.
/// Hasil kalibrasi 2026-11-22 dari kalibrasi_sensor_air_esp32.ino.
/// Tegangan sudah di sisi sensor (ADC mV * DIV_PH), bukan ADC mentah.
/// Slope (3030-2852)/3 = 59.3 mV/pH (Nernst ideal ~59.16 mV/pH).
/// mv1 == mv2 => guard returns ph1 (hindari div-by-zero).
constexpr float kPhCalPoint1_pH = 7.00f;
constexpr float kPhCalPoint1_mV = 2852.0f; // V_PH7 = 2.852 V
constexpr float kPhCalPoint2_pH = 4.00f;
constexpr float kPhCalPoint2_mV = 3030.0f; // V_PH4 = 3.030 V

/// TDS calibration: baseline voltage di air 0-1 TDS (V_TDS0) dan pengali
/// span (TDS_K). Keduanya dari sketch kalibrasi yang sama.
constexpr float kTdsZeroMv = 253.1f; // V_TDS0 = 0.2531 V
constexpr float kTdsGain = 1.0f;     // TDS_K belum dikalibrasi -> default

/** Inisialisasi ADC (11 dB), OneWire/DS18B20, dan gate pin.
 *  Kembalikan false jika inisialisasi gagal. */
bool sensors_init(void);

/** Nyalakan daya sensor via gate pin (termasuk warm-up). */
void sensors_power_on(void);

/** Matikan daya sensor via gate pin sebelum tidur. */
void sensors_power_off(void);

/** Baca suhu (°C) dari DS18B20. NAN jika sensor tidak terdeteksi. */
float read_temperature_c(void);

/** Baca pH dari pH 4502C (median filter + divider + kalibrasi dua titik). */
float read_ph(void);

/** Baca TDS (ppm) dari TDS v1.0 (median filter + kompensasi suhu). */
float read_tds_ppm(float temperature_c);

/** Baca baterai (mV) dari GPIO33, atau -1 jika tidak digunakan. */
int read_battery_mv(void);

#endif
