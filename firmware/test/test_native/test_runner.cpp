#include "unity.h"

// Test functions defined in separate translation units.
extern void test_median_filter_odd_n_returns_middle(void);
extern void test_median_filter_even_n_averages_middle_two(void);
extern void test_median_filter_ignores_outlier_spike(void);
extern void test_median_filter_all_equal(void);
extern void test_median_filter_n_1(void);
extern void test_median_filter_does_not_sort_original(void);

extern void test_divider_1_5_undoes_ratio(void);
extern void test_tds_compensation_factor(void);
extern void test_tds_zero_volt_is_zero(void);
extern void test_tds_increases_with_voltage(void);
extern void test_ph_returns_ph1_at_mv1_and_ph2_at_mv2(void);
extern void test_ph_linear_in_between(void);
extern void test_ph_guards_equal_calibration_voltages(void);
extern void test_ph_uses_measured_calibration_data(void);
extern void test_ntu_clamps_at_zero(void);
extern void test_ntu_decreases_with_voltage(void);

extern void test_ph_boundaries_inclusive(void);
extern void test_tds_boundaries(void);
extern void test_turbidity_boundaries(void);
extern void test_worst_parameter_wins(void);
extern void test_alert_reasons(void);

extern void test_build_telemetry_all_keys_and_types(void);
extern void test_build_telemetry_includes_battery_when_provided(void);
extern void test_build_telemetry_rejects_nan(void);
extern void test_build_telemetry_rejects_inf(void);
extern void test_build_alert_keys(void);

extern void test_ph_boundaries_inclusive(void);
extern void test_tds_boundaries(void);
extern void test_turbidity_boundaries(void);
extern void test_worst_parameter_wins(void);

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_median_filter_odd_n_returns_middle);
    RUN_TEST(test_median_filter_even_n_averages_middle_two);
    RUN_TEST(test_median_filter_ignores_outlier_spike);
    RUN_TEST(test_median_filter_all_equal);
    RUN_TEST(test_median_filter_n_1);
    RUN_TEST(test_median_filter_does_not_sort_original);
    RUN_TEST(test_divider_1_5_undoes_ratio);
    RUN_TEST(test_tds_compensation_factor);
    RUN_TEST(test_tds_zero_volt_is_zero);
    RUN_TEST(test_tds_increases_with_voltage);
    RUN_TEST(test_ph_returns_ph1_at_mv1_and_ph2_at_mv2);
    RUN_TEST(test_ph_linear_in_between);
    RUN_TEST(test_ph_guards_equal_calibration_voltages);
    RUN_TEST(test_ph_uses_measured_calibration_data);
    RUN_TEST(test_ntu_clamps_at_zero);
    RUN_TEST(test_ntu_decreases_with_voltage);
    RUN_TEST(test_ph_boundaries_inclusive);
    RUN_TEST(test_tds_boundaries);
    RUN_TEST(test_turbidity_boundaries);
    RUN_TEST(test_worst_parameter_wins);
    RUN_TEST(test_alert_reasons);
    RUN_TEST(test_build_telemetry_all_keys_and_types);
    RUN_TEST(test_build_telemetry_includes_battery_when_provided);
    RUN_TEST(test_build_telemetry_rejects_nan);
    RUN_TEST(test_build_telemetry_rejects_inf);
    RUN_TEST(test_build_alert_keys);
    return UNITY_END();
}
