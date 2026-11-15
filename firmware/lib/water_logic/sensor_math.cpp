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

float ph_from_voltage(float voltage_mv, float ph1, float mv1, float ph2, float mv2) {
    const float denom = mv2 - mv1;
    if (denom == 0.0f) {
        return ph1; // fallback, avoid division by zero
    }
    const float slope = (ph2 - ph1) / denom;
    return ph1 + slope * (voltage_mv - mv1);
}

