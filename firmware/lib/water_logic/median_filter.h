#ifndef MEDIAN_FILTER_H
#define MEDIAN_FILTER_H

#include <cstddef>

/// Maksimum sampel yang didukung (buffer stack; tanpa alokasi dinamis).
constexpr size_t kMedianFilterMaxSamples = 256;

/// Mengembalikan median dari `n` nilai pada `samples`. Array input tidak
/// dimodifikasi (pekerjaan dilakukan pada salinan pribadi). Untuk `n` genap,
/// mengembalikan rata-rata dua elemen tengah. `n` harus dalam [1, kMedianFilterMaxSamples].
float median_filter(const float* samples, size_t n);

#endif
