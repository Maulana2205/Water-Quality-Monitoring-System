#ifndef PAYLOAD_H
#define PAYLOAD_H

#include <ArduinoJson.h>
#include "classifier.h"

#include <cmath>
#include <cstddef>
#include <cstdint>

// Builds telemetry payload per shared/telemetry.schema.json.
// Returns false (and leaves doc untouched) if any sensor value is NaN/inf.
// battery_mv only written when has_battery is true.
template <typename TDocument>
bool build_telemetry(TDocument& doc, const char* device_id, uint32_t ts,
                     uint32_t seq, float temperature,
                     float ph, float tds_ppm, Status status,
                     uint32_t active_time_ms, int rssi, const char* fw,
                     int battery_mv, bool has_battery) {
    if (device_id == nullptr || fw == nullptr) {
        return false;
    }
    if (!std::isfinite(temperature) ||
        !std::isfinite(ph) || !std::isfinite(tds_ppm)) {
        return false;
    }

    doc["device_id"] = device_id;
    doc["ts"] = ts;
    doc["seq"] = seq;
    doc["temperature"] = temperature;
    doc["ph"] = ph;
    doc["tds_ppm"] = tds_ppm;
    switch (status) {
        case Status::DRINKABLE:   doc["status"] = "DRINKABLE"; break;
        case Status::HYGIENE_OK:  doc["status"] = "HYGIENE_OK"; break;
        case Status::UNFIT:       doc["status"] = "UNFIT"; break;
    }
    doc["active_time_ms"] = active_time_ms;
    doc["rssi"] = rssi;
    doc["fw"] = fw;
    if (has_battery) {
        doc["battery_mv"] = battery_mv;
    }
    return true;
}

// Builds alert payload per shared/telemetry.schema.json (alert topic).
template <typename TDocument>
bool build_alert(TDocument& doc, const char* device_id, uint32_t ts,
                 const char** reasons, size_t n_reasons) {
    if (device_id == nullptr) {
        return false;
    }
    doc["device_id"] = device_id;
    doc["ts"] = ts;
    ArduinoJson::JsonArray arr = doc.createNestedArray("reasons");
    for (size_t i = 0; i < n_reasons; ++i) {
        if (reasons[i] != nullptr) {
            arr.add(reasons[i]);
        }
    }
    return true;
}

#endif
