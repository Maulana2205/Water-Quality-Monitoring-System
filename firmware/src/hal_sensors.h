#ifndef HAL_SENSORS_H
#define HAL_SENSORS_H

#include <cstddef>

/// Pin mapping (ADC1 only — safe to use while WiFi is active).
constexpr int kPinDs18b20 = 4;       // DS18B20 DATA (OneWire)
constexpr int kPinTurbidity = 34;    // SEN0189 via 10k/20k divider -> ADC1
constexpr int kPinPh = 35;           // pH 4502C Po via 10k/20k divider -> ADC1
constexpr int kPinTds = 32;          // TDS v1.0 analog out -> ADC1 (no divider)
constexpr int kPinBattery = 33;      // optional battery divider -> ADC1

/// Sensor power-gate GPIO (load switch / MOSFET). Sesuaikan dengan wiring fisik.
constexpr int kPinSensorGate = 23;

/// ADC attenuation: 11 dB => ~0-3300 mV range (uses eFuse calibration).
constexpr int kAdcAttenuation = 11;

/// Jumlah sampel median filter per sensor per siklus.
constexpr int kSamplesPerSensor = 30;

/// pH two-point calibration voltages (mV). UKUR dengan buffer pH 7 dan pH 4,
/// lalu ganti placeholder ini. 0 => guard returns neutral pH 7.0.
constexpr float kVoltagePh7 = 0.0f;
constexpr float kVoltagePh4 = 0.0f;

/** Inisialisasi ADC (11 dB), OneWire/DS18B20, dan gate pin.
 *  Kembalikan false jika inisialisasi gagal. */
bool sensors_init(void);

/** Nyalakan daya sensor via gate pin (termasuk warm-up). */
void sensors_power_on(void);

/** Matikan daya sensor via gate pin sebelum tidur. */
void sensors_power_off(void);

/** Baca suhu (°C) dari DS18B20. NAN jika sensor tidak terdeteksi. */
float read_temperature_c(void);

/** Baca kekeruhan (NTU) dari SEN0189 (median filter + divider + curve). */
float read_turbidity_ntu(void);

/** Baca pH dari pH 4502C (median filter + divider + kalibrasi dua titik). */
float read_ph(void);

/** Baca TDS (ppm) dari TDS v1.0 (median filter + kompensasi suhu). */
float read_tds_ppm(float temperature_c);

/** Baca baterai (mV) dari GPIO33, atau -1 jika tidak digunakan. */
int read_battery_mv(void);

#endif
