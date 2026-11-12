#include "hal_sensors.h"

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include "../lib/water_logic/median_filter.h"
#include "../lib/water_logic/sensor_math.h"

static OneWire s_oneWire(kPinDs18b20);
static DallasTemperature s_ds(&s_oneWire);

bool sensors_init(void) {
  pinMode(kPinSensorGate, OUTPUT);
  digitalWrite(kPinSensorGate, LOW);

  analogSetAttenuation(static_cast<adc_attenuation_t>(kAdcAttenuation));
  pinMode(kPinTurbidity, INPUT);
  pinMode(kPinPh, INPUT);
  pinMode(kPinTds, INPUT);
  pinMode(kPinBattery, INPUT);

  s_ds.begin();
  s_ds.setResolution(12); // ~750 ms conversion
  return true;
}

void sensors_power_on(void) {
  digitalWrite(kPinSensorGate, HIGH);
  // Warm-up sensor board (pH/TDS/turbidity) sebelum sampling.
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
  s_ds.requestTemperatures();
  float c = s_ds.getTempCByIndex(0);
  if (c == DEVICE_DISCONNECTED_C || c < -50.0f || c > 100.0f) {
    return NAN;
  }
  return c;
}

float read_turbidity_ntu(void) {
  const float adc_mv = read_adc_mv_median(kPinTurbidity);
  const float sensor_mv = mv_to_sensor_mv(adc_mv, DIV_TURB);
  return ntu_from_voltage(sensor_mv);
}

float read_ph(void) {
  const float adc_mv = read_adc_mv_median(kPinPh);
  const float sensor_mv = mv_to_sensor_mv(adc_mv, DIV_PH);
  return ph_from_voltage(sensor_mv, kVoltagePh7, kVoltagePh4);
}

float read_tds_ppm(float temperature_c) {
  const float adc_mv = read_adc_mv_median(kPinTds);
  return tds_from_voltage(adc_mv, temperature_c);
}

int read_battery_mv(void) {
  return static_cast<int>(analogReadMilliVolts(kPinBattery));
}
