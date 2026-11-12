#include "median_filter.h"

#include <algorithm>

float median_filter(const float* samples, size_t n) {
    if (samples == nullptr || n == 0 || n > kMedianFilterMaxSamples) {
        return 0.0f;
    }
    float buf[kMedianFilterMaxSamples];
    for (size_t i = 0; i < n; ++i) {
        buf[i] = samples[i];
    }
    std::sort(buf, buf + n);
    if (n % 2u == 1u) {
        return buf[n / 2u];
    }
    return (buf[n / 2u - 1u] + buf[n / 2u]) / 2.0f;
}
