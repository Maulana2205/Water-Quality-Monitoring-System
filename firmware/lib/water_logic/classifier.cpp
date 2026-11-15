#include "classifier.h"

#include <algorithm>

namespace {

Status parameter_status(float value, float drinkable_max, float hygiene_max) {
    // lower inclusive (0), upper exclusive; >= hygiene_max -> UNFIT
    if (value < drinkable_max) {
        return Status::DRINKABLE;
    }
    if (value < hygiene_max) {
        return Status::HYGIENE_OK;
    }
    return Status::UNFIT;
}

Status worst(Status a, Status b) {
    return static_cast<Status>(std::max(static_cast<int>(a), static_cast<int>(b)));
}

} // namespace

Classification classify(float ph, float tds_ppm,
                        const Thresholds& t) {
    // pH: both bounds inclusive -> DRINKABLE inside, UNFIT outside.
    Status ph_status = (ph >= t.ph_min && ph <= t.ph_max)
                           ? Status::DRINKABLE
                           : Status::UNFIT;

    Status tds_status = parameter_status(tds_ppm, t.tds_drinkable_max,
                                         t.tds_hygiene_max);

    Status s = worst(ph_status, tds_status);
    return Classification{s};
}

unsigned alert_reasons(float ph, float tds_ppm, const Thresholds& t) {
    unsigned reasons = 0;
    if (ph < t.ph_min || ph > t.ph_max) {
        reasons |= ALERT_PH_OUT_OF_RANGE;
    }
    // strictly greater than max (1000) -> alert
    if (tds_ppm > t.tds_hygiene_max) {
        reasons |= ALERT_TDS_GT_MAX;
    }
    return reasons;
}
