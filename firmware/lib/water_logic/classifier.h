#ifndef CLASSIFIER_H
#define CLASSIFIER_H

#include <cstddef>

enum class Status { DRINKABLE, HYGIENE_OK, UNFIT };

struct Classification {
    Status status;
};

// Mirror of shared/thresholds.json (single source of truth).
// Boundary semantics: lower inclusive, upper exclusive, except pH both inclusive.
struct Thresholds {
    float ph_min = 6.5f;
    float ph_max = 8.5f;        // both inclusive
    float tds_drinkable_max = 300.0f;   // tds < max
    float tds_hygiene_max = 1000.0f;    // tds < max
};

Classification classify(float ph, float tds_ppm,
                        const Thresholds& t);

// Alert rule: pH outside [ph_min, ph_max] OR tds > tds_hygiene_max (1000).
enum AlertReason : unsigned {
    ALERT_PH_OUT_OF_RANGE = 1u << 0,
    ALERT_TDS_GT_MAX      = 1u << 1,
};

unsigned alert_reasons(float ph, float tds_ppm, const Thresholds& t = Thresholds{});

#endif
