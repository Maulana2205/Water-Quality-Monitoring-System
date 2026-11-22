#include "unity.h"
#include "classifier.h"

void test_ph_boundaries_inclusive(void) {
    Thresholds t{}; // pH 6.5-8.5 both inclusive (Permenkes 2/2023)
    t.ph_min = 6.5f; t.ph_max = 8.5f;

    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(6.5f, 100.0f, t).status);   // lower inclusive
    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(8.5f, 100.0f, t).status);   // upper inclusive
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(6.49f, 100.0f, t).status);
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(8.51f, 100.0f, t).status);
}

void test_tds_boundaries(void) {
    Thresholds t{}; // Permenkes 2/2023: TDS < 300 mg/L, upper exclusive
    t.ph_min = 6.5f; t.ph_max = 8.5f;
    t.tds_drinkable_max = 300.0f; t.tds_hygiene_max = 300.0f;

    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(7.0f, 0.0f, t).status);    // lower inclusive
    TEST_ASSERT_EQUAL(Status::DRINKABLE, classify(7.0f, 299.0f, t).status);   // < 300
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(7.0f, 300.0f, t).status);       // upper exclusive -> UNFIT
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(7.0f, 999.0f, t).status);
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(7.0f, 1000.0f, t).status);
}

void test_no_hygiene_tier_emitted(void) {
    // Permenkes 2/2023 gives identical physico-chemical limits for drinking
    // and hygiene water -> the classifier must never emit HYGIENE_OK.
    const float samples[] = {0.0f, 299.0f, 300.0f, 500.0f, 1000.0f};
    for (float tds : samples) {
        TEST_ASSERT_NOT_EQUAL(Status::HYGIENE_OK, classify(7.0f, tds, Thresholds{}).status);
    }
}

void test_worst_parameter_wins(void) {
    Thresholds t{};
    t.ph_min = 6.5f; t.ph_max = 8.5f;
    t.tds_drinkable_max = 300.0f; t.tds_hygiene_max = 300.0f;

    // pH good, TDS >= 300 -> UNFIT
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(7.0f, 500.0f, t).status);
    // pH unfit overrides everything
    TEST_ASSERT_EQUAL(Status::UNFIT, classify(9.0f, 100.0f, t).status);
}

void test_alert_reasons(void) {
    Thresholds t{}; // pH 6.5-8.5; TDS alert at >= 300
    t.ph_min = 6.5f; t.ph_max = 8.5f;
    t.tds_drinkable_max = 300.0f; t.tds_hygiene_max = 300.0f;

    TEST_ASSERT_EQUAL(0u, alert_reasons(7.0f, 0.0f));
    TEST_ASSERT_EQUAL(0u, alert_reasons(7.0f, 299.0f));              // none
    TEST_ASSERT_EQUAL(ALERT_PH_OUT_OF_RANGE, alert_reasons(9.0f, 100.0f));
    TEST_ASSERT_EQUAL(ALERT_TDS_GT_MAX, alert_reasons(7.0f, 300.0f)); // >= 300 -> alert
    TEST_ASSERT_EQUAL(ALERT_TDS_GT_MAX, alert_reasons(7.0f, 1001.0f));
    TEST_ASSERT_EQUAL(ALERT_PH_OUT_OF_RANGE | ALERT_TDS_GT_MAX,
                      alert_reasons(9.0f, 300.0f));
}
