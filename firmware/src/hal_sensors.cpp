#include "hal_sensors.h"

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "../lib/water_logic/median_filter.h"
#include "../lib/water_logic/sensor_math.h"

static OneWire s_oneWire(kPinDs18b20);
static DallasTemperature s_ds(&s_oneWire);

/// ADC attenuation: 11 dB => ~0-3300 mV range (uses eFuse calibration).
/// Harus enum adc_attenuation_t (nilai 0-4), bukan angka dB mentah.
static constexpr adc_attenuation_t kAdcAttenuation = ADC_11db;

bool sensors_init(void) {
  pinMode(kPinSensorGate, OUTPUT);
  digitalWrite(kPinSensorGate, LOW);

  analogSetAttenuation(kAdcAttenuation);
  pinMode(kPinPh, INPUT);
  pinMode(kPinTds, INPUT);
  pinMode(kPinBattery, INPUT);

  s_ds.begin();
  s_ds.setResolution(12); // ~750 ms conversion
  return true;
}

void sensors_power_on(void) {
  digitalWrite(kPinSensorGate, HIGH);
  // Warm-up sensor board (pH/TDS) sebelum sampling.
  delay(2000);
}

void sensors_power_off(void) {
  digitalWrite(kPinSensorGate, LOW);
}

static float read_adc_mv_median(int pin) {
  float samples[kSamplesPerSensor];
  for (int i = 0; i < kSamplesPerSensor; ++i) {
    samples[i] = static_cast<float>(analogReadMilliVolts(pin));
  }
  return median_filter(samples, kSamplesPerSensor);
}

float read_temperature_c(void) {
  // DS18B20 occasionally drops out (returns DEVICE_DISCONNECTED_C). Retry a few
  // times so one glitch does not discard the whole telemetry cycle (build_telemetry
  // rejects NaN).
  for (int attempt = 0; attempt < 3; ++attempt) {
    s_ds.requestTemperatures();
    float c = s_ds.getTempCByIndex(0);
    if (c != DEVICE_DISCONNECTED_C && c > -50.0f && c < 100.0f) {
      return c;
    }
    delay(20);
  }
  return NAN;
}

float read_ph(void) {
  const float adc_mv = read_adc_mv_median(kPinPh);
  const float sensor_mv = mv_to_sensor_mv(adc_mv, DIV_PH);
  const float ph = ph_from_voltage(sensor_mv,
                                   kPhCalPoint1_pH, kPhCalPoint1_mV,
                                   kPhCalPoint2_pH, kPhCalPoint2_mV);
  // Diagnostic: bandingkan adc_mv dengan multimeter pada pin (GPIO35).
  Serial.print(F("[ph] adc_mv="));
  Serial.print(adc_mv, 0);
  Serial.print(F(" sensor_mv="));
  Serial.print(sensor_mv, 0);
  Serial.print(F(" ph="));
  Serial.println(ph, 3);
  return ph;
}

float read_tds_ppm(float temperature_c) {
  const float adc_mv = read_adc_mv_median(kPinTds);
  const float tds = tds_from_voltage(adc_mv, temperature_c);
  // Diagnostic: bandingkan adc_mv dengan multimeter pada pin (GPIO32).
  // Catatan: > ~2450 mV keluar dari rentang linear ADC ESP32 (11 dB).
  Serial.print(F("[tds] adc_mv="));
  Serial.print(adc_mv, 0);
  Serial.print(F(" temp_c="));
  Serial.print(temperature_c, 2);
  Serial.print(F(" tds_ppm="));
  Serial.println(tds, 1);
  return tds;
}

int read_battery_mv(void) {
  return static_cast<int>(analogReadMilliVolts(kPinBattery));
}
