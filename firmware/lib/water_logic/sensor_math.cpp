#include "sensor_math.h"

#include <algorithm>

float mv_to_sensor_mv(float adc_mv, float div) {
    return adc_mv * div;
}

float tds_compensation_factor(float temperature_c) {
    return 1.0f + 0.02f * (temperature_c - 25.0f);
}

float tds_from_voltage(float voltage_mv, float temperature_c) {
    const float factor = tds_compensation_factor(temperature_c);
    if (factor == 0.0f) {
        return 0.0f;
    }
    const float v = (voltage_mv / 1000.0f) / factor;
    const float v2 = v * v;
    const float v3 = v2 * v;
    float tds = (133.42f * v3 - 255.86f * v2 + 857.39f * v) * 0.5f;
    return tds < 0.0f ? 0.0f : tds;
}

float ph_from_voltage(float voltage_mv, float v_ph7, float v_ph4) {
    const float denom = v_ph4 - v_ph7;
    if (denom == 0.0f) {
        return 7.0f; // neutral fallback, avoid division by zero
    }
    const float slope = (4.0f - 7.0f) / denom;
    return 7.0f + slope * (voltage_mv - v_ph7);
}

float ntu_from_voltage(float voltage_mv) {
    const float v = voltage_mv / 1000.0f;
    // SEN0189 starting fit (placeholder -> replace with formazin/standards fit).
    // Decreasing with voltage; clamp at >= 0.
    float ntu = 1000.0f * (1.0f - v);
    return ntu < 0.0f ? 0.0f : ntu;
}
