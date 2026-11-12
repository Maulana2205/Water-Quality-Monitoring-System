#include "unity.h"
#include "classifier.h"

void test_ph_boundaries_inclusive(void) {
    Thresholds t{}; // pH 6.5-8.5 both inclusive; TDS <300/<1000; turb <3/<25
    t.ph_min = 6.5f; t.ph_max = 8.5f;
    t.tds_drinkable_max = 300.0f; t.tds_hygiene_max = 1000.0f;
    t.turb_drinkable_max = 3.0f; t.turb_hygiene_max = 25.0f;

    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(6.5f, 100.0f, 1.0f, t).status);   // lower inclusive
    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(8.5f, 100.0f, 1.0f, t).status);   // upper inclusive
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(6.49f, 100.0f, 1.0f, t).status);
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(8.51f, 100.0f, 1.0f, t).status);
}

void test_tds_boundaries(void) {
    Thresholds t{};
    t.ph_min = 6.5f; t.ph_max = 8.5f;
    t.tds_drinkable_max = 300.0f; t.tds_hygiene_max = 1000.0f;
    t.turb_drinkable_max = 3.0f; t.turb_hygiene_max = 25.0f;

    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(7.0f, 299.0f, 1.0f, t).status);   // < 300
    TEST_ASSERT_EQUAL(Status::HYGIENE_OK, classify(7.0f, 300.0f, 1.0f, t).status);   // upper exclusive -> hygiene
    TEST_ASSERT_EQUAL(Status::HYGIENE_OK, classify(7.0f, 999.0f, 1.0f, t).status);   // < 1000
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(7.0f, 1000.0f, 1.0f, t).status);       // >= 1000
}

void test_turbidity_boundaries(void) {
    Thresholds t{};
    t.ph_min = 6.5f; t.ph_max = 8.5f;
    t.tds_drinkable_max = 300.0f; t.tds_hygiene_max = 1000.0f;
    t.turb_drinkable_max = 3.0f; t.turb_hygiene_max = 25.0f;

    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(7.0f, 100.0f, 2.9f, t).status);   // < 3
    TEST_ASSERT_EQUAL(Status::HYGIENE_OK, classify(7.0f, 100.0f, 3.0f, t).status);   // upper exclusive
    TEST_ASSERT_EQUAL(Status::HYGIENE_OK, classify(7.0f, 100.0f, 24.9f, t).status);  // < 25
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(7.0f, 100.0f, 25.0f, t).status);       // >= 25
}

void test_worst_parameter_wins(void) {
    Thresholds t{};
    t.ph_min = 6.5f; t.ph_max = 8.5f;
    t.tds_drinkable_max = 300.0f; t.tds_hygiene_max = 1000.0f;
    t.turb_drinkable_max = 3.0f; t.turb_hygiene_max = 25.0f;

    // pH good, TDS hygiene, turb good -> HYGIENE_OK (worst = TDS)
    TEST_ASSERT_EQUAL(Status::HYGIENE_OK, classify(7.0f, 500.0f, 1.0f, t).status);
    // pH unfit overrides everything
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(9.0f, 100.0f, 1.0f, t).status);
}

void test_alert_reasons(void) {
    Thresholds t{}; // pH range 6.5-8.5; TDS alert > 1000
    t.ph_min = 6.5f; t.ph_max = 8.5f;

    TEST_ASSERT_EQUAL(0u, alert_reasons(7.0f, 500.0f));             // none
    TEST_ASSERT_EQUAL(ALERT_PH_OUT_OF_RANGE, alert_reasons(9.0f, 500.0f));
    TEST_ASSERT_EQUAL(ALERT_TDS_GT_MAX, alert_reasons(7.0f, 1001.0f));
    TEST_ASSERT_EQUAL(ALERT_PH_OUT_OF_RANGE | ALERT_TDS_GT_MAX,
                      alert_reasons(9.0f, 1001.0f));
    // TDS exactly 1000 is NOT > 1000 -> no TDS alert
    TEST_ASSERT_EQUAL(0u, alert_reasons(7.0f, 1000.0f));
}


