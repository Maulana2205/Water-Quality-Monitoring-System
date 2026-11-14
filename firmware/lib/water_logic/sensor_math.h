#ifndef SENSOR_MATH_H
#define SENSOR_MATH_H

#include <cstddef>

/// Voltage divider ratios (used in code, not in hardware layer raw output).
constexpr float DIV_TURB = 1.5f;
constexpr float DIV_PH = 1.5f;

/// Undo voltage divider: sensor_mv = adc_mv * div.
float mv_to_sensor_mv(float adc_mv, float div);

/// Temperature compensation factor: f_comp = 1.0 + 0.02 * (T - 25.0).
float tds_compensation_factor(float temperature_c);

/// TDS (ppm) from compensated voltage.
///   V_c = (voltage_mv / 1000) / f_comp
///   TDS = (133.42*V_c^3 - 255.86*V_c^2 + 857.39*V_c) * 0.5
/// Result clamped at >= 0.
float tds_from_voltage(float voltage_mv, float temperature_c);

/// Two-point pH calibration from arbitrary calibration points.
///   slope = (ph2 - ph1) / (mv2 - mv1)
///   pH = ph1 + slope * (voltage_mv - mv1)
/// Guards mv2 == mv1 (returns ph1 instead of dividing by zero).
float ph_from_voltage(float voltage_mv, float ph1, float mv1, float ph2, float mv2);

/// Turbidity -> NTU via curve (SEN0189 starting fit; replace with formazin fit).
/// Decreasing with voltage; clamped at >= 0.
float ntu_from_voltage(float voltage_mv);

#endif
