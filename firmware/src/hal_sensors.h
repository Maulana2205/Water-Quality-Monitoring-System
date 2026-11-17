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
/// UKUR dengan buffer standar, lalu ganti placeholder ini.
/// mv1 == mv2 => guard returns ph1 (hindari div-by-zero).
constexpr float kPhCalPoint1_pH = 6.86f;   // ukuran Anda: pH 6.86
constexpr float kPhCalPoint1_mV = 1678.5f; // (1.678 + 1.679) / 2 V
constexpr float kPhCalPoint2_pH = 4.00f;   // ukuran Anda: pH 4.0
constexpr float kPhCalPoint2_mV = 1988.0f; // (1.987 + 1.989) / 2 V

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
