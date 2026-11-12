# Action Plan v2: IoT Water Quality Monitoring System (Green Tech & LCA-Aware)

## 1. Project Overview & Goals

* **Objective:** ESP32 IoT system measuring Temperature (°C), Turbidity (NTU), pH, and TDS (ppm), classifying water as *drinkable / hygiene-only / unfit*, with a real-time web dashboard.
* **Hardware:** ESP32 Dev Module, DS18B20 (GPIO4), SEN0189 Turbidity (GPIO34), pH 4502C (GPIO35), TDS Meter v1.0 (GPIO32). All analog pins are **ADC1** (safe to use while WiFi is on; never use ADC2 pins).
* **Sustainability / LCA Strategy:**
  * Active window target ≤ 20 s per cycle, then Deep Sleep 30 min (48 cycles/day).
  * Sensor power gating during sleep (see §5), otherwise sleep current dominates the energy budget.
  * MQTT over TLS: QoS 0 + retained for telemetry, QoS 1 for alerts.
* **Cloud Broker:** EMQX Cloud Serverless (Southeast Asia region; use the exact host shown in the console).
* **Dashboard:** Vite + React + TypeScript + Tailwind CSS v4 + Recharts + `mqtt` (WSS).

### Key changes from v1 (and why)

| # | v1 | v2 | Reason |
|---|----|----|--------|
| 1 | `PubSubClient` with QoS 1 publish | `256dpi/MQTT` (arduino-mqtt) | PubSubClient **cannot publish at QoS 1**; alerts would silently be QoS 0 |
| 2 | Telemetry not retained | `retain=true` on telemetry + localStorage ring buffer in dashboard | With a 30-min interval a freshly opened dashboard would be empty for up to 30 min |
| 3 | Logic mixed with hardware in `main.cpp` | Pure-C++ `lib/water_logic` + thin `main.cpp` | Makes unit testing on host (no board) possible |
| 4 | No unit tests | Unity (native) + Vitest/RTL + contract tests + CI | Requirement |
| 5 | JS, `tailwind.config.js`, ArduinoJson v6 | TypeScript, Tailwind v4 (`@tailwindcss/vite`), ArduinoJson v7 | Current stable stacks, type-safe payload parsing |
| 6 | Status as free text (`"LAYAK CUCI/MANDI"`) | Enum code (`DRINKABLE`, `HYGIENE_OK`, `UNFIT`) + UI label map | Stable contract, easy i18n |
| 7 | Same credentials idea for device & web | Separate users + ACL (device: publish only, web: subscribe only) | Vite env vars are public in the bundle |
| 8 | Classification thresholds undefined | Single `thresholds.json` shared by firmware & web | One source of truth, testable |
| 9 | "60-day battery per cycle" (unclear) | Explicit energy budget with measurable sleep current | Claim must be verifiable for the LCA |

---

## 2. Directory & Workspace Structure

```
water-quality-monitoring/
├── plan.md
├── shared/
│   ├── thresholds.json              # classification thresholds (single source of truth)
│   ├── telemetry.schema.json        # JSON Schema for payload (contract)
│   └── fixtures/                    # sample payloads used by both test suites
├── firmware/                        # PlatformIO (C++ / Arduino-ESP32)
│   ├── platformio.ini
│   ├── include/secrets.example.h    # copy to secrets.h (gitignored)
│   ├── lib/
│   │   └── water_logic/             # PURE C++, no Arduino.h -> testable on host
│   │       ├── median_filter.{h,cpp}
│   │       ├── sensor_math.{h,cpp}  # divider, pH cal, TDS comp, NTU curve
│   │       ├── classifier.{h,cpp}   # thresholds -> status + alert flags
│   │       └── payload.{h,cpp}      # ArduinoJson payload builder
│   ├── src/
│   │   ├── main.cpp                 # setup(): sample -> classify -> publish -> sleep
│   │   ├── hal_sensors.{h,cpp}      # ADC / DS18B20 access (hardware only)
│   │   └── net.{h,cpp}              # WiFi + TLS + MQTT
│   └── test/
│       ├── test_native/             # Unity tests, run on PC
│       └── test_device/             # optional on-board smoke tests
├── web-dashboard/
│   ├── package.json
│   ├── vite.config.ts               # includes Vitest config
│   ├── .env.example
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── SensorCard.tsx
│       │   ├── QualityStatusBadge.tsx
│       │   ├── HistoricalChart.tsx
│       │   ├── DeviceStatus.tsx     # online / stale / offline
│       │   └── SustainabilityPanel.tsx
│       ├── services/mqttClient.ts
│       ├── hooks/useTelemetry.ts
│       ├── lib/
│       │   ├── parseTelemetry.ts    # zod validation
│       │   ├── classify.ts          # uses shared/thresholds.json
│       │   ├── history.ts           # localStorage ring buffer
│       │   └── staleness.ts
│       └── __tests__/               # Vitest + React Testing Library
├── tools/
│   └── simulate_device.mjs          # publishes fake telemetry (dev without hardware)
└── .github/workflows/ci.yml
```

---

## 3. Tech Stack Decisions

| Layer | Choice | Notes |
|-------|--------|-------|
| Firmware build | PlatformIO, `espressif32`, Arduino framework | Keeps your current workflow |
| MQTT client (ESP32) | `256dpi/MQTT` + `WiFiClientSecure` | QoS 0/1, retain, TLS |
| JSON | `bblanchon/ArduinoJson @ ^7` | Works on host too (used in native tests) |
| Temp sensor | `OneWire` + `DallasTemperature` | |
| Firmware tests | Unity via `pio test -e native` | Needs a host C++ compiler (gcc/MinGW on Windows) |
| Frontend | Vite + React 18/19 + **TypeScript** | |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (no config file needed) | |
| Charts | Recharts | |
| MQTT (web) | `mqtt` (mqtt.js) over `wss://…:8084/mqtt` | |
| Validation | `zod` | Reject malformed payloads |
| Web tests | Vitest + `@testing-library/react` + `jsdom` | |
| E2E (optional) | Playwright + local Aedes/Mosquitto broker | |
| CI | GitHub Actions | |

---

## 4. Contracts

### 4.1 Telemetry payload — topic `water_quality/<device_id>/telemetry` (QoS 0, **retain=true**)

```json
{
  "device_id": "esp32_water_01",
  "ts": 1767225600,
  "seq": 128,
  "temperature": 27.5,
  "turbidity_ntu": 12.0,
  "ph": 7.2,
  "tds_ppm": 145.0,
  "status": "HYGIENE_OK",
  "active_time_ms": 18400,
  "rssi": -61,
  "fw": "0.2.0"
}
```

* `ts`: epoch seconds from NTP sync (fallback: dashboard stamps on receipt if `ts == 0`).
* `seq`: boot counter stored in `RTC_DATA_ATTR` → dashboard detects missed cycles.
* Optional: `battery_mv` (divider on GPIO33 / ADC1).
* `status` ∈ `DRINKABLE | HYGIENE_OK | UNFIT`; UI maps to Indonesian labels (“LAYAK KONSUMSI”, “LAYAK CUCI/MANDI”, “TIDAK LAYAK”).

### 4.2 Alert payload — topic `water_quality/<device_id>/alert` (QoS 1, retain=false)

```json
{ "device_id": "esp32_water_01", "ts": 1767225600, "reasons": ["PH_OUT_OF_RANGE"], "values": { "ph": 9.1 } }
```

### 4.3 Thresholds — `shared/thresholds.json` (configurable)

| Parameter | DRINKABLE | HYGIENE_OK | UNFIT |
|-----------|-----------|------------|-------|
| pH | 6.5 – 8.5 | 6.5 – 8.5 | outside range |
| TDS (ppm) | < 300 | < 1000 | ≥ 1000 |
| Turbidity (NTU) | < 3 | < 25 | ≥ 25 |
| Temperature | within ±3 °C of ambient air | — | — |

> ⚠️ Verify these values against the regulation text you cite in the report (Permenkes No. 2/2023: drinking water vs. hygiene & sanitation water) before freezing the file. Boundary rules: lower bound inclusive, upper bound exclusive, except pH where both bounds are inclusive. Tests lock this behavior in.

Alert rule (unchanged from v1): pH outside [6.5, 8.5] **or** TDS > 1000 ppm → publish alert (QoS 1).

### 4.4 Access control (EMQX)

* `device_esp32_01`: publish only on `water_quality/esp32_water_01/#`.
* `dashboard_ro`: subscribe only on `water_quality/#`. This is the only credential that goes into `VITE_*` env vars (it is visible in the bundle, so it must be read-only).
* Firmware: pin the broker CA certificate (download from the console); do **not** use `setInsecure()`.

---

## 5. Implementation Phases

### Phase 1: Environment & Workspace Setup
- [x] Init git repo, `.gitignore` (`secrets.h`, `.env`, `.pio`, `node_modules`).
- [x] `firmware/`: PlatformIO project, envs `esp32dev` and `native`.
- [x] `web-dashboard/`: `npm create vite@latest web-dashboard -- --template react-ts`.
- [x] Web deps: `tailwindcss @tailwindcss/vite recharts mqtt zod lucide-react`.
- [x] Web dev deps: `vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8`.
- [x] Create `shared/thresholds.json`, `shared/telemetry.schema.json`, `shared/fixtures/*.json`.

### Phase 2: Firmware (`firmware/`) — logic first, hardware second

**2a. `platformio.ini`**
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
build_flags = -DCORE_DEBUG_LEVEL=0
lib_deps =
    paulstoffregen/OneWire @ ^2.3.7
    milesburton/DallasTemperature @ ^3.11.0
    256dpi/MQTT @ ^2.5.2
    bblanchon/ArduinoJson @ ^7.0.0

[env:native]
platform = native
test_framework = unity
build_flags = -std=gnu++17 -Ilib/water_logic
lib_deps =
    bblanchon/ArduinoJson @ ^7.0.0
lib_ignore = OneWire, DallasTemperature, MQTT
```

**2b. Pure logic (`lib/water_logic`)** — TDD: write the test, then the function.
- [x] `median_filter`: median of N=30 samples (sort copy; handles even N).
- [x] `sensor_math`:
  * `mv_to_sensor_mv(adc_mv, div)` with `DIV_TURB = 1.5`, `DIV_PH = 1.5` (TDS v1.0 outputs 0–2.3 V → no divider).
  * Temperature compensation: `f_comp = 1.0 + 0.02 × (T − 25.0)`; compensated voltage `V_c = V / f_comp`; then `TDS = (133.42·V_c³ − 255.86·V_c² + 857.39·V_c) × 0.5`.
  * pH two-point: `slope = (4.0 − 7.0) / (V_pH4 − V_pH7)`; `pH = 7.0 + slope × (V − V_pH7)`.
  * Turbidity → NTU via curve (start with DFRobot SEN0189 polynomial, then **replace with your own fit** from formazin/known standards; clamp at 0).
- [x] `classifier`: thresholds → `Status` enum + alert reasons.
- [x] `payload`: build telemetry/alert JSON (`JsonDocument`), no hardware dependency.

**2c. Hardware layer (`src/`)**
- [ ] `hal_sensors`: use `analogReadMilliVolts()` with 11 dB attenuation (uses eFuse calibration) instead of raw `analogRead`; DS18B20 with 12-bit conversion (~750 ms) — request conversion early and sample ADCs while it runs.
- [ ] Sensor power gating: a GPIO-driven load switch/MOSFET for the pH, TDS, turbidity boards; allow warm-up (≈ 1–3 s) before sampling.
- [ ] `net`: WiFi connect with timeout; cache channel/BSSID in `RTC_DATA_ATTR` to speed reconnects; NTP sync (store in RTC); TLS with pinned CA; MQTT connect.
- [ ] `main.cpp` flow: wake → power sensors → sample → classify → connect → publish telemetry (retain) → if alert, publish QoS 1 **and wait for PUBACK** → `client.disconnect()` → power off sensors → `esp_deep_sleep_start()`.
- [ ] Hard timeout watchdog: if the active window exceeds 30 s (WiFi/broker down), skip publish and sleep anyway.
- [ ] Deep sleep: `esp_sleep_enable_timer_wakeup(30ULL * 60ULL * 1000000ULL)`.

**Estimated active-time budget (validate in Phase 6):**

| Step | Est. |
|------|------|
| Boot + init | 0.3 s |
| Sensor warm-up + sampling (N=30 each) | 3–5 s |
| WiFi connect (cached) | 2–5 s |
| NTP + TLS + MQTT connect | 3–5 s |
| Publish + flush / PUBACK | 0.5–1 s |
| **Total** | **≈ 10–17 s** |

**Energy budget (for the LCA section):**
`E_day = 48 × (P_active × t_active) + P_sleep × (24 h − 48 × t_active)`

With the v1 figure of 0.444 W × 20 s = 8.88 J ≈ 2.47 mWh/cycle → ≈ **118 mWh/day** active energy. On a 3000 mAh 18650 (≈ 11.1 Wh), a 60-day target allows ≈ 185 mWh/day, leaving ≈ 67 mWh/day for sleep ≈ **0.75 mA average at 3.7 V**. A stock ESP32 DevKit (USB-UART chip, LDO, power LED) typically idles well above that, so the 60-day goal requires gated sensors and a low-quiescent power path, or a larger battery / small solar panel. **Measure `P_sleep` with a multimeter/power profiler and put the measured number in the report.**

### Phase 3: EMQX Cloud Setup
- [ ] Create a Serverless deployment (Southeast Asia region); check the current free-tier quota in the console.
- [ ] Authentication: create the two users in §4.4; add ACL rules.
- [ ] Record endpoints **from the console overview page** (hostnames differ per deployment): MQTT TLS `:8883`, WSS `:8084/mqtt`.
- [ ] Download the CA certificate; embed in firmware.
- [ ] Smoke test with MQTTX: subscribe, publish retained message, confirm ACL denies wrong topics.

### Phase 4: Web Dashboard (`web-dashboard/`)
- [x] `services/mqttClient.ts`: connect over WSS with auto-reconnect; subscribe `water_quality/+/telemetry` and `water_quality/+/alert`.
- [x] `lib/parseTelemetry.ts`: validate with zod against the shared schema; drop invalid messages (log count).
- [x] `lib/history.ts`: persist the last 48 points (≈ 24 h) in localStorage; hydrate on load; the retained message provides the latest point instantly.
- [x] `lib/staleness.ts`: `online` < 45 min, `stale` 45–90 min, `offline` > 90 min since last `ts` (deep sleep means “disconnected” ≠ “offline”).
- [ ] UI:
  * Four `SensorCard`s with per-sensor color status (from `thresholds.json`). [x]
  * `QualityStatusBadge` for overall status (Indonesian labels). [x]
  * `HistoricalChart` (Recharts) with threshold reference lines. [x]
  * `DeviceStatus` (last seen, RSSI, seq gap, firmware version). [x]
  * `SustainabilityPanel`: active time, duty cycle, estimated energy/day, estimated battery life (computed from the formula in Phase 2, with measured `P_sleep` as a config value).
  * Alert toast/banner for QoS 1 alerts. [x]
- [ ] Responsive layout (mobile-first, field use), light/dark mode.
- [ ] (Stretch) Long-term storage: EMQX data integration to a free-tier time-series DB, so history survives beyond one browser.

### Phase 5: Unit & Integration Testing (runs from Phase 2 onward, not at the end)

**5.1 Firmware — Unity, `pio test -e native`**

| Module | Test cases |
|--------|-----------|
| `median_filter` | odd/even N; outlier spike ignored; all-equal; N=1; unsorted input unchanged |
| `sensor_math` divider | 1.5 ratio: 2000 mV ADC → 3000 mV sensor; 0 mV |
| TDS compensation | T=25 → factor 1.0; T=30 → 1.10; T=20 → 0.90; TDS(0 V)=0; monotonic increase with V |
| pH calibration | returns 7.0 at V_pH7, 4.0 at V_pH4; linear in between; guards `V_pH4 == V_pH7` (div by zero) |
| NTU curve | clamps at ≥ 0; decreasing with voltage |
| `classifier` | boundaries: pH 6.5 / 8.5 inclusive, 6.49 / 8.51 UNFIT; TDS 299/300/999/1000; NTU 2.9/3/24.9/25; worst-parameter-wins |
| alert rule | pH out of range → alert; TDS > 1000 → alert; both → two reasons; none → no alert |
| `payload` | all required keys present; types correct; matches `telemetry.schema.json` fixtures; NaN/inf sensor value handled (omit or error flag) |

Optional on-device (`pio test -e esp32dev`): ADC returns within 0–3300 mV, DS18B20 present (≠ −127 °C), deep-sleep wake counter increments.

**5.2 Web — Vitest + React Testing Library**

| Target | Test cases |
|--------|-----------|
| `parseTelemetry` | valid fixture passes; missing field / wrong type / unknown status rejected |
| `classify` | same boundary table as firmware, driven by the **same** `thresholds.json` |
| `history` | ring buffer keeps max 48; order preserved; corrupted localStorage → empty, no crash |
| `staleness` | online/stale/offline boundaries with fake timers |
| `useTelemetry` | mock `mqtt` (`vi.mock`); message → state update; reconnect updates status; invalid message ignored |
| `SensorCard` / `QualityStatusBadge` | correct label and color class per status; renders units |
| `HistoricalChart` | renders N points; empty state |
| `DeviceStatus` | shows seq-gap warning when `seq` jumps |

Coverage target: ≥ 80% on `lib/` and `services/`.

**5.3 Contract test (firmware ↔ web)**
- [ ] Firmware native test serializes a payload and validates it against `telemetry.schema.json`.
- [ ] Web test validates the same `shared/fixtures/*.json` through zod **and** the schema. A schema change breaks both suites.

**5.4 Integration / E2E (optional but recommended)**
- [ ] `tools/simulate_device.mjs` publishes scenarios (normal, high TDS, bad pH, missed cycle, malformed payload) to a local broker.
- [ ] Playwright: dashboard reflects each scenario (badge, alert banner, stale state).

**5.5 CI — `.github/workflows/ci.yml`**
- [ ] Job `firmware`: `pio test -e native` and `pio run -e esp32dev` (build check).
- [ ] Job `web`: `npm ci` → `tsc --noEmit` → `eslint` → `vitest run --coverage` → `vite build`.

### Phase 6: Calibration, Field Testing & Verification
- [ ] Measure the active window across ≥ 50 cycles (target ≤ 20 s; record mean/p95).
- [ ] Measure sleep current and compute real battery life; update the Sustainability panel constants.
- [ ] Verify TLS stability: ≥ 100 consecutive cycles without a failed publish; review reconnect behavior when WiFi is down.
- [ ] pH calibration with pH 7.0 and 4.0 buffers (add a pH 10.0 check point), temperature-compensated; report MAE against a reference meter.
- [ ] TDS check against a reference solution (e.g., 342 ppm NaCl) and a handheld meter; turbidity against known standards.
- [ ] Field test: confirm retained message shows data on first dashboard load; verify alert delivery (QoS 1) end-to-end.
- [ ] Record results in a table (planned vs. measured) for the report.

---

## 6. Recommended Skills (Claude)

| Skill | Use in | What it helps with |
|-------|--------|--------------------|
| `frontend-design` | Phase 4 | Distinctive, readable dashboard UI instead of a generic template; mobile-first layout |
| `xlsx` | Phase 6 | Calibration/field-test data tables, MAE calculation, charts from CSV logs |
| `docx` | Reporting | Turning the LCA, test results, and design decisions into a formatted Word report |
| `pdf` | Reporting | Export final report / datasheet compilation |
| `skill-creator` | Optional | Build a project-specific skill (e.g., “firmware-test-runner” that always runs `pio test -e native` and checks boundary cases) |
| `product-self-knowledge` | Only if you add Claude API features | Not needed for the core system |

There is no ESP32-specific skill in the available set; for firmware, rely on the TDD flow in §5.1 and CI.

---

## 7. Definition of Done

- [ ] `pio test -e native` and `vitest run` both green in CI.
- [ ] Contract test passes against shared fixtures.
- [ ] Active window ≤ 20 s (p95) and measured sleep current documented.
- [ ] Dashboard shows the latest reading immediately on load (retained) and flags stale devices.
- [ ] No secrets in git; dashboard uses a subscribe-only credential; firmware uses a pinned CA.
- [ ] LCA figures in the dashboard come from measured values, not assumptions.

## Deviations (catatan waktu pelaksanaan)

- `HistoricalChart` — garis referensi ambang batas sudah ditambahkan (Recharts `ReferenceLine` dari `thresholds.json` mirror). Catatan: semua parameter berbagi satu Y-axis, garis pH tertekan saat skala TDS dominan; perbaikan sumbu Y terpisah ditunda.
- Alert toast/banner QoS 1 sudah ditampilkan di `App.tsx` dari `useTelemetry.alerts` dengan label Indonesia.
- `DeviceStatus` sudah menampilkan RSSI, versi firmware, dan peringatan lompat seq dari telemetry terbaru.
- `SustainabilityPanel` masih pakai asumsi (TDS rendah = hemat energi); angka LCA aktual ditunggu hasil pengukuran `P_sleep` (Phase 6).
- Responsive grid sudah ada (mobile-first), tapi belum ada toggle dark mode terpisah (Tailwind `dark:` sudah aktif).

Wiring:
    DS18B20  DATA -> GPIO4   (VCC 3V3, GND)
    SEN0189  A    -> pembagi 10k/20k -> GPIO34  (VCC 5V, GND)
    pH 4502C Po   -> pembagi 10k/20k -> GPIO35  (V+ 5V, GND)
    TDS v1.0 A    -> GPIO32  (VCC 3V3, GND)
