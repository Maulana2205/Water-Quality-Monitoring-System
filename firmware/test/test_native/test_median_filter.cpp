#include "unity.h"
#include "median_filter.h"

void test_median_filter_odd_n_returns_middle(void) {
    float samples[] = {3.0f, 1.0f, 2.0f};
    TEST_ASSERT_EQUAL_FLOAT(2.0f, median_filter(samples, 3));
}

void test_median_filter_even_n_averages_middle_two(void) {
    float samples[] = {4.0f, 1.0f, 3.0f, 2.0f};
    // sorted: 1, 2, 3, 4 -> median = (2+3)/2 = 2.5
    TEST_ASSERT_EQUAL_FLOAT(2.5f, median_filter(samples, 4));
}

void test_median_filter_ignores_outlier_spike(void) {
    float samples[] = {10.0f, 12.0f, 11.0f, 1000.0f, 11.0f};
    // sorted: 10, 11, 11, 12, 1000 -> median = 11
    TEST_ASSERT_EQUAL_FLOAT(11.0f, median_filter(samples, 5));
}

void test_median_filter_all_equal(void) {
    float samples[] = {7.0f, 7.0f, 7.0f, 7.0f, 7.0f};
    TEST_ASSERT_EQUAL_FLOAT(7.0f, median_filter(samples, 5));
}

void test_median_filter_n_1(void) {
    float samples[] = {42.5f};
    TEST_ASSERT_EQUAL_FLOAT(42.5f, median_filter(samples, 1));
}

void test_median_filter_does_not_sort_original(void) {
    float samples[] = {9.0f, 1.0f, 5.0f};
    float before[] = {9.0f, 1.0f, 5.0f};
    median_filter(samples, 3);
    TEST_ASSERT_EQUAL_FLOAT_ARRAY(before, samples, 3);
}


