#include "unity.h"
#include "payload.h"
#include <ArduinoJson.h>
#include <math.h>

static void check_telemetry_keys(StaticJsonDocument<512>& doc) {
    TEST_ASSERT_TRUE(doc.containsKey("device_id"));
    TEST_ASSERT_TRUE(doc.containsKey("ts"));
    TEST_ASSERT_TRUE(doc.containsKey("seq"));
    TEST_ASSERT_TRUE(doc.containsKey("temperature"));
    TEST_ASSERT_TRUE(doc.containsKey("turbidity_ntu"));
    TEST_ASSERT_TRUE(doc.containsKey("ph"));
    TEST_ASSERT_TRUE(doc.containsKey("tds_ppm"));
    TEST_ASSERT_TRUE(doc.containsKey("status"));
    TEST_ASSERT_TRUE(doc.containsKey("active_time_ms"));
    TEST_ASSERT_TRUE(doc.containsKey("rssi"));
    TEST_ASSERT_TRUE(doc.containsKey("fw"));
}

void test_build_telemetry_all_keys_and_types(void) {
    StaticJsonDocument<512> doc;
    bool ok = build_telemetry(doc, "esp32_water_01", 1767225600UL, 128,
                              27.5f, 12.0f, 7.2f, 145.0f, Status::HYGIENE_OK,
                              18400UL, -61, "0.2.0", -1, false);
    TEST_ASSERT_TRUE(ok);
    check_telemetry_keys(doc);
    TEST_ASSERT_EQUAL_STRING("esp32_water_01", doc["device_id"].as<const char*>());
    TEST_ASSERT_EQUAL(1767225600UL, doc["ts"].as<unsigned long>());
    TEST_ASSERT_EQUAL(128U, doc["seq"].as<unsigned int>());
    TEST_ASSERT_EQUAL_FLOAT(27.5f, doc["temperature"].as<float>());
    TEST_ASSERT_EQUAL_FLOAT(12.0f, doc["turbidity_ntu"].as<float>());
    TEST_ASSERT_EQUAL_FLOAT(7.2f, doc["ph"].as<float>());
    TEST_ASSERT_EQUAL_FLOAT(145.0f, doc["tds_ppm"].as<float>());
    TEST_ASSERT_EQUAL_STRING("HYGIENE_OK", doc["status"].as<const char*>());
    TEST_ASSERT_EQUAL(18400UL, doc["active_time_ms"].as<unsigned long>());
    TEST_ASSERT_EQUAL(-61, doc["rssi"].as<int>());
    TEST_ASSERT_EQUAL_STRING("0.2.0", doc["fw"].as<const char*>());
    // battery omitted when not provided
    TEST_ASSERT_FALSE(doc.containsKey("battery_mv"));
}

void test_build_telemetry_includes_battery_when_provided(void) {
    StaticJsonDocument<512> doc;
    bool ok = build_telemetry(doc, "esp32_water_01", 1767225600UL, 128,
                              27.5f, 12.0f, 7.2f, 145.0f, Status::DRINKABLE,
                              15000UL, -55, "0.2.0", 3700, true);
    TEST_ASSERT_TRUE(ok);
    TEST_ASSERT_EQUAL(3700, doc["battery_mv"].as<int>());
}

void test_build_telemetry_rejects_nan(void) {
    StaticJsonDocument<512> doc;
    bool ok = build_telemetry(doc, "esp32_water_01", 1767225600UL, 128,
                              NAN, 12.0f, 7.2f, 145.0f, Status::HYGIENE_OK,
                              15000UL, -55, "0.2.0", -1, false);
    TEST_ASSERT_FALSE(ok);
}

void test_build_telemetry_rejects_inf(void) {
    StaticJsonDocument<512> doc;
    bool ok = build_telemetry(doc, "esp32_water_01", 1767225600UL, 128,
                              27.5f, 12.0f, INFINITY, 145.0f,
                              Status::HYGIENE_OK, 15000UL, -55, "0.2.0", -1, false);
    TEST_ASSERT_FALSE(ok);
}

void test_build_alert_keys(void) {
    StaticJsonDocument<512> doc;
    const char* reasons[] = {"PH_OUT_OF_RANGE"};
    bool ok = build_alert(doc, "esp32_water_01", 1767225600UL, reasons, 1);
    TEST_ASSERT_TRUE(ok);
    TEST_ASSERT_EQUAL_STRING("esp32_water_01", doc["device_id"].as<const char*>());
    TEST_ASSERT_EQUAL(1767225600UL, doc["ts"].as<unsigned long>());
    TEST_ASSERT_TRUE(doc.containsKey("reasons"));
    TEST_ASSERT_EQUAL(1U, doc["reasons"].size());
    TEST_ASSERT_EQUAL_STRING("PH_OUT_OF_RANGE", doc["reasons"][0].as<const char*>());
}


