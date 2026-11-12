#include "unity.h"
#include "sensor_math.h"

void test_divider_1_5_undoes_ratio(void) {
    TEST_ASSERT_EQUAL_FLOAT(3000.0f, mv_to_sensor_mv(2000.0f, DIV_TURB));
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

void test_ph_returns_7_at_vph7_and_4_at_vph4(void) {
    const float v_ph7 = 1500.0f;
    const float v_ph4 = 2000.0f;
    TEST_ASSERT_EQUAL_FLOAT(7.0f, ph_from_voltage(v_ph7, v_ph7, v_ph4));
    TEST_ASSERT_EQUAL_FLOAT(4.0f, ph_from_voltage(v_ph4, v_ph7, v_ph4));
}

void test_ph_linear_in_between(void) {
    const float v_ph7 = 1500.0f;
    const float v_ph4 = 2000.0f;
    // midpoint voltage -> midpoint pH (5.5)
    TEST_ASSERT_EQUAL_FLOAT(5.5f, ph_from_voltage(1750.0f, v_ph7, v_ph4));
}

void test_ph_guards_equal_calibration_voltages(void) {
    // v_ph4 == v_ph7 would divide by zero; must not crash, return neutral 7.0
    TEST_ASSERT_EQUAL_FLOAT(7.0f, ph_from_voltage(1500.0f, 1500.0f, 1500.0f));
}

void test_ntu_clamps_at_zero(void) {
    // High voltage -> curve goes negative -> clamped to 0
    TEST_ASSERT_EQUAL_FLOAT(0.0f, ntu_from_voltage(3300.0f));
}

void test_ntu_decreases_with_voltage(void) {
    float n1 = ntu_from_voltage(0.0f);
    float n2 = ntu_from_voltage(1000.0f);
    float n3 = ntu_from_voltage(2000.0f);
    TEST_ASSERT_TRUE(n1 >= n2);
    TEST_ASSERT_TRUE(n2 >= n3);
}


