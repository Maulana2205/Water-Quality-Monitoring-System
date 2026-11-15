/**
 * tools/simulate_device.mjs
 *
 * Publishes fake telemetry scenarios to an MQTT broker for field-testing the
 * web dashboard without real hardware.
 *
 * Scenarios (per plan.md §5.4):
 *   normal      - typical drinkable water reading
 *   high-tds    - TDS above 1000 ppm -> UNFIT + alert
 *   bad-ph      - pH outside [6.5, 8.5] -> UNFIT + alert
 *   missed-cycle - seq jumps (gap) to test DeviceStatus seq-gap warning
 *   malformed   - invalid JSON -> invalidCount increment
 *
 * Kredensial dibaca dari environment variable, JANGAN hardcode di sini:
 *   SIM_MQTT_URL       wss://<host>:8084/mqtt  (default wss://localhost:8084/mqtt)
 *   SIM_MQTT_USER      username (optional)
 *   SIM_MQTT_PASS      password (optional)
 *   SIM_DEVICE_ID      device id (default esp32_water_01)
 *   SIM_QOS            0 or 1 (default 0)
 *   SIM_RETAIN         true/false (default true)
 *
 * Contoh:
 *   SIM_MQTT_URL=wss://broker.emqx.io:8084/mqtt node tools/simulate_device.mjs normal
 */

import mqtt from 'mqtt'
import fs from 'node:fs'
import path from 'node:path'

/** Muat variabel dari tools/.env jika ada (tidak menimpa env yang sudah ada). */
function loadDotEnv() {
  const envPath = path.join(path.dirname(process.argv[1]), '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1')
    if (key && process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}

loadDotEnv()

const URL = process.env.SIM_MQTT_URL ?? 'wss://localhost:8084/mqtt'
const USER = process.env.SIM_MQTT_USER
const PASS = process.env.SIM_MQTT_PASS
const DEVICE_ID = process.env.SIM_DEVICE_ID ?? 'esp32_water_01'
const QOS = Number(process.env.SIM_QOS ?? 0)
const RETAIN = process.env.SIM_RETAIN !== 'false'

const now = () => Math.floor(Date.now() / 1000)

const telemetry = ({ seq, status, ph, tds_ppm, temperature, ts = now(), active_time_ms = 11000, rssi = -60, fw = '0.2.0', battery_mv }) => ({
  device_id: DEVICE_ID,
  ts,
  seq,
  temperature,
  ph,
  tds_ppm,
  status,
  active_time_ms,
  rssi,
  fw,
  ...(battery_mv != null ? { battery_mv } : {}),
})

const alert = ({ ts = now(), reasons, values = {} }) => ({
  device_id: DEVICE_ID,
  ts,
  reasons,
  values,
})

const SCENARIOS = {
  normal: () => {
    const tm = telemetry({
      seq: 1,
      status: 'DRINKABLE',
      ph: 7.2,
      tds_ppm: 145,
      temperature: 27.5,
    })
    return [{ topic: `water_quality/${DEVICE_ID}/telemetry`, payload: tm, retain: true }]
  },

  'high-tds': () => {
    const tm = telemetry({
      seq: 2,
      status: 'UNFIT',
      ph: 7.0,
      tds_ppm: 1200,
      temperature: 27.5,
    })
    const al = alert({ reasons: ['TDS_GT_MAX'], values: { tds_ppm: 1200 } })
    return [
      { topic: `water_quality/${DEVICE_ID}/telemetry`, payload: tm, retain: true },
      { topic: `water_quality/${DEVICE_ID}/alert`, payload: al, retain: false },
    ]
  },

  'bad-ph': () => {
    const tm = telemetry({
      seq: 3,
      status: 'UNFIT',
      ph: 9.2,
      tds_ppm: 200,
      temperature: 27.5,
    })
    const al = alert({ reasons: ['PH_OUT_OF_RANGE'], values: { ph: 9.2 } })
    return [
      { topic: `water_quality/${DEVICE_ID}/telemetry`, payload: tm, retain: true },
      { topic: `water_quality/${DEVICE_ID}/alert`, payload: al, retain: false },
    ]
  },

  'missed-cycle': () => {
    // seq jumps from 1 to 10 -> gap warning in DeviceStatus
    const tm = telemetry({
      seq: 10,
      status: 'HYGIENE_OK',
      ph: 7.5,
      tds_ppm: 400,
      temperature: 27.5,
    })
    return [{ topic: `water_quality/${DEVICE_ID}/telemetry`, payload: tm, retain: true }]
  },

  malformed: () => [
    { topic: `water_quality/${DEVICE_ID}/telemetry`, payload: 'not-json', retain: true },
  ],
}

const scenario = process.argv[2]
if (!SCENARIOS[scenario]) {
  console.error('Usage: node tools/simulate_device.mjs <scenario>')
  console.error('Scenarios:', Object.keys(SCENARIOS).join(', '))
  process.exit(1)
}

const connectOptions = {
  clientId: `simulate_device_${Math.random().toString(16).slice(2, 8)}`,
  ...(USER ? { username: USER } : {}),
  ...(PASS ? { password: PASS } : {}),
}

const client = mqtt.connect(URL, connectOptions)

client.on('connect', () => {
  console.log(`[sim] connected to ${URL} as ${DEVICE_ID}`)
  const messages = SCENARIOS[scenario]()
  let sent = 0
  for (const { topic, payload, retain = RETAIN } of messages) {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload)
    client.publish(topic, str, { qos: QOS, retain }, (err) => {
      if (err) {
        console.error(`[sim] publish failed ${topic}:`, err.message)
      } else {
        console.log(`[sim] published ${topic} (qos=${QOS}, retain=${retain})`)
      }
      sent += 1
      if (sent === messages.length) {
        client.end(() => {
          console.log('[sim] done, disconnected')
          process.exit(0)
        })
      }
    })
  }
})

client.on('error', (err) => {
  console.error('[sim] mqtt error:', err.message)
  process.exit(1)
})
