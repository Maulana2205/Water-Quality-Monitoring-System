# AGENTS.md

Project: IoT Water Quality Monitoring System (ESP32 + EMQX Cloud + React dashboard).
Source of truth: `README.md` plus the `shared/` contracts. Read `README.md` fully before starting any task. If this file and `README.md` conflict, stop and ask.

## Communication

* Reply to the user in **Indonesian**. Keep code, comments, commit messages, and identifiers in **English**.
* Be concise. State what you did, what you verified, and what is left.
* Never claim something works without showing the command you ran and its result.

## Repository layout

```
README.md       source of truth: tech stack, layout, features, wiring, time/energy budget
AGENTS.md       this file (agent rules)
shared/         thresholds.json, telemetry.schema.json, fixtures/   (contract between firmware and web)
firmware/       PlatformIO project (C++/Arduino-ESP32)
  lib/water_logic/   PURE C++ (no Arduino.h). All business logic lives here.
  src/               hardware layer only (ADC, DS18B20, WiFi, MQTT, deep sleep)
  test/test_native/  Unity tests, run on the host PC
web-dashboard/  Vite + React + TypeScript + Tailwind v4 + Recharts + mqtt.js
tools/          simulate_device.mjs
```

## Tech stack (do not substitute without asking)

* Firmware: PlatformIO, `espressif32`, Arduino framework, `256dpi/MQTT` (NOT PubSubClient: it cannot publish QoS 1), ArduinoJson v7, OneWire, DallasTemperature.
* Web: Vite, React, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`, no `tailwind.config.js`), Recharts, `mqtt`, `zod`.
* Tests: Unity (`pio test -e native`), Vitest + React Testing Library + jsdom. Optional: Playwright.

## Commands

Run these from the stated directory.

| Task | Directory | Command |
|------|-----------|---------|
| Firmware unit tests (host) | `firmware/` | `pio test -e native` |
| Firmware build check | `firmware/` | `pio run -e esp32dev` |
| Flash / serial monitor (user only) | `firmware/` | `pio run -t upload` / `pio device monitor` |
| Install web deps | `web-dashboard/` | `npm install` |
| Web dev server | `web-dashboard/` | `npm run dev` |
| Web unit tests | `web-dashboard/` | `npx vitest run` |
| Web coverage | `web-dashboard/` | `npx vitest run --coverage` |
| Typecheck / lint / build | `web-dashboard/` | `npx tsc --noEmit` / `npm run lint` / `npm run build` |
| Simulator | repo root | `node tools/simulate_device.mjs <scenario>` |

If a command fails because a tool is missing (for example no host `g++` for `native` tests), stop and tell the user exactly what to install. Do not work around it by skipping tests.

## Workflow rules

1. **One task per session.** Work only on the component or task the user names (see `README.md` §Fungsional). Do not jump ahead.
2. **Plan first.** For any non-trivial task, list the files you will create or change and wait for approval if the user is in Plan mode.
3. **TDD.** For logic in `lib/water_logic`, `web-dashboard/src/lib`, and `services/`: write the failing test first, run it and confirm it fails for the right reason, then implement until green. One module per iteration.
4. **Definition of done for any task:** relevant tests pass, build passes, and you have shown the output. A task with a red test or build is not done.
5. **Small commits.** After a green task, propose a commit message (conventional commits: `feat:`, `test:`, `fix:`, `chore:`). Commit only when the user asks.
6. **Stop and ask** if a decision changes thresholds, the payload contract, the tech stack, or anything touching hardware wiring.

## Architecture rules

* **Firmware logic is pure.** Median filter, voltage conversion, pH calibration, TDS compensation, classification, and payload building go in `lib/water_logic` with no Arduino or ESP-IDF headers. `src/` only does I/O and calls into the library.
* **Single source of truth for thresholds:** `shared/thresholds.json`. Never hardcode threshold numbers in firmware or web code. The firmware may generate a header from the JSON at build time or mirror it, but a test must fail if they drift.
* **Payload contract:** `shared/telemetry.schema.json` plus `shared/fixtures/*.json`. Any change to the payload requires updating the schema, fixtures, firmware test, and web test in the same change.
* Status values are enums: `DRINKABLE`, `HYGIENE_OK`, `UNFIT`. Indonesian labels ("LAYAK KONSUMSI", "LAYAK CUCI/MANDI", "TIDAK LAYAK") exist only in the web UI.
* Boundary semantics: lower bound inclusive, upper bound exclusive, except pH where both bounds are inclusive. Tests must cover each boundary.

## Firmware rules

* Use ADC1 pins only (GPIO32, 34, 35). Never ADC2 while WiFi is active.
* Read ADC with `analogReadMilliVolts()` at 11 dB attenuation. Apply voltage divider ratio (`DIV_PH = 1.5`) in code, not in the hardware layer's raw output.
* Telemetry topic `water_quality/<device_id>/telemetry`: QoS 0, `retain=true`. Alerts on `water_quality/<device_id>/alert`: QoS 1, and **wait for PUBACK before sleeping**.
* Always disconnect MQTT cleanly, power down sensors via the gate pin, then call `esp_deep_sleep_start()`.
* Implement a watchdog: if the active window exceeds 30 s, skip publishing and go to sleep.
* Keep per-cycle state (`seq`, WiFi channel/BSSID cache, last NTP sync) in `RTC_DATA_ATTR`.
* Use the pinned broker CA certificate. Never use `setInsecure()`.
* Do not add `delay()` for long waits; use the time budget in `README.md` §Anggaran waktu & energi.

## Web rules

* Validate every incoming MQTT message with `zod`; drop and count invalid messages. Never trust the payload.
* The dashboard subscribes with a **read-only** credential. Do not add publish features.
* History: persist the last 48 points in localStorage with a ring buffer; handle corrupted storage without crashing.
* Device state is `online` / `stale` / `offline` based on time since last `ts`, not on MQTT connection state (the device sleeps by design).
* Components must be responsive (mobile-first). For UI work, follow the `frontend-design` skill if available: avoid generic template looks.
* Mock `mqtt` in unit tests (`vi.mock('mqtt')`); no test may require network access.

## Secrets and safety (strict)

* **Never** read, print, log, commit, or put in a prompt any WiFi password, MQTT username/password, or API key.
* Credentials live only in `firmware/include/secrets.h` and `web-dashboard/.env` (both gitignored). Maintain `secrets.example.h` and `.env.example` with placeholders.
* Before every commit proposal, check `git status` and `git diff --staged` for secrets.
* Do not install global packages or modify system configuration. Install only through `npm` and `pio` inside the project.
* Do not run `pio run -t upload`, erase flash, or touch serial ports. Hardware actions belong to the user.
* Do not run destructive commands (`rm -rf` outside `node_modules`/`.pio`/build folders, `git reset --hard`, `git push --force`) without explicit approval.

## Things the user does manually (ask, do not attempt)

* EMQX Cloud console setup (deployment, users, ACL, CA download).
* Flashing the board, wiring, sensor power gating, calibration with buffer solutions.
* Measuring sleep current and field testing. When the user provides measured values, update constants and tests accordingly.

## Conventions

* C++: C++17, `snake_case` for functions and files, no dynamic allocation in `lib/water_logic` hot paths, `constexpr` for constants.
* TypeScript: `strict` on, no `any`, functional components and hooks, named exports.
* Tests are named after behavior (`returns_7_at_ph7_voltage`, `rejects_payload_missing_tds`).
* Keep `README.md` updated: record current status, known issues, and deviations under "Status & catatan terkini".

## Checklist for the agent

Before saying a task is done:

- [ ] All tasks named by the user are addressed
- [ ] Tests written first and now passing (show output)
- [ ] `pio run -e esp32dev` and/or `npm run build` pass
- [ ] No secrets in the diff
- [ ] `README.md` "Status & catatan terkini" updated if behavior or known issues changed
- [ ] Summary to the user in Indonesian: what changed, what was verified, what the user must do manually next
