#include "unity.h"
#include "sensor_math.h"

void test_divider_1_5_undoes_ratio(void) {
    TEST_ASSERT_EQUAL_FLOAT(0.0f, mv_to_sensor_mv(0.0f, DIV_PH));
}

void test_tds_compensation_factor(void) {
    TEST_ASSERT_EQUAL_FLOAT(1.0f, tds_compensation_factor(25.0f));
    TEST_ASSERT_EQUAL_FLOAT(1.10f, tds_compensation_factor(30.0f));
    TEST_ASSERT_EQUAL_FLOAT(0.90f, tds_compensation_factor(20.0f));
}

void test_tds_zero_volt_is_zero(void) {
    TEST_ASSERT_EQUAL_FLOAT(0.0f, tds_from_voltage(0.0f, 25.0f));
}

void test_tds_increases_with_voltage(void) {
    float t1000 = tds_from_voltage(1000.0f, 25.0f);
    float t1500 = tds_from_voltage(1500.0f, 25.0f);
    float t2000 = tds_from_voltage(2000.0f, 25.0f);
    TEST_ASSERT_TRUE(t1000 < t1500);
    TEST_ASSERT_TRUE(t1500 < t2000);
}

void test_ph_returns_ph1_at_mv1_and_ph2_at_mv2(void) {
    const float ph1 = 7.0f;
    const float mv1 = 1500.0f;
    const float ph2 = 4.0f;
    const float mv2 = 2000.0f;
    TEST_ASSERT_EQUAL_FLOAT(ph1, ph_from_voltage(mv1, ph1, mv1, ph2, mv2));
    TEST_ASSERT_EQUAL_FLOAT(ph2, ph_from_voltage(mv2, ph1, mv1, ph2, mv2));
}

void test_ph_linear_in_between(void) {
    const float ph1 = 7.0f;
    const float mv1 = 1500.0f;
    const float ph2 = 4.0f;
    const float mv2 = 2000.0f;
    // midpoint voltage -> midpoint pH (5.5)
    TEST_ASSERT_EQUAL_FLOAT(5.5f, ph_from_voltage(1750.0f, ph1, mv1, ph2, mv2));
}

void test_ph_guards_equal_calibration_voltages(void) {
    // mv2 == mv1 would divide by zero; must not crash, return ph1
    TEST_ASSERT_EQUAL_FLOAT(7.0f, ph_from_voltage(1500.0f, 7.0f, 1500.0f, 4.0f, 1500.0f));
}

void test_ph_uses_measured_calibration_data(void) {
    // Data kalibrasi dari KalibrasiPH.txt (midpoint rentang tegangan)
    const float ph1 = 6.86f;
    const float mv1 = 1678.5f; // (1.678 + 1.679) / 2 V
    const float ph2 = 4.00f;
    const float mv2 = 1988.0f; // (1.987 + 1.989) / 2 V

    TEST_ASSERT_EQUAL_FLOAT(ph1, ph_from_voltage(mv1, ph1, mv1, ph2, mv2));
    TEST_ASSERT_EQUAL_FLOAT(ph2, ph_from_voltage(mv2, ph1, mv1, ph2, mv2));
    // titik tengah tegangan -> titik tengah pH
    TEST_ASSERT_EQUAL_FLOAT(5.43f, ph_from_voltage(1833.25f, ph1, mv1, ph2, mv2));
}


