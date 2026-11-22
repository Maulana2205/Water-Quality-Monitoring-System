import { useCallback, useEffect, useRef, useState } from 'react'
import type { Telemetry } from '../lib/parseTelemetry'
import { parseTelemetry } from '../lib/parseTelemetry'
import { parseAlert } from '../lib/parseAlert'
import { History } from '../lib/history'
import { deviceState, type DeviceState } from '../lib/staleness'
import { createMqttClient, type MqttClient } from '../services/mqttClient'

export interface UseTelemetryOptions {
  url: string
  deviceId: string
  username?: string
  password?: string
}

export interface TelemetryView {
  latest: Telemetry | null
  history: Telemetry[]
  state: DeviceState
  connected: boolean
  invalidCount: number
  alerts: string[]
}

/** Append without duplicates; keep at most the last 10 reasons. */
function appendAlerts(prev: string[], reasons: string[]): string[] {
  return Array.from(new Set([...prev.slice(-9), ...reasons]))
}

export function useTelemetry({
  url,
  deviceId,
  username,
  password,
}: UseTelemetryOptions): TelemetryView {
  const [latest, setLatest] = useState<Telemetry | null>(null)
  const [history, setHistory] = useState<Telemetry[]>([])
  const [state, setState] = useState<DeviceState>('offline')
  const [connected, setConnected] = useState(false)
  const [invalidCount, setInvalidCount] = useState(0)
  const [alerts, setAlerts] = useState<string[]>([])

  const historyRef = useRef(new History())
  const lastTsRef = useRef<number | null>(null)

  const handleMessage = useCallback(
    (topic: string, payload: Buffer) => {
      if (topic.endsWith('/alert')) {
        // Hanya alert perangkat ini yang ditampilkan.
        if (topic !== `water_quality/${deviceId}/alert`) return
        try {
          const reasons = parseAlert(JSON.parse(payload.toString()))
          if (!reasons) {
            setInvalidCount((c) => c + 1)
            return
          }
          setAlerts((a) => appendAlerts(a, reasons))
        } catch {
          setInvalidCount((c) => c + 1)
        }
        return
      }

      let parsed: ReturnType<typeof parseTelemetry>
      try {
        parsed = parseTelemetry(JSON.parse(payload.toString()))
      } catch {
        setInvalidCount((c) => c + 1)
        return
      }
      if (!parsed.ok) {
        setInvalidCount((c) => c + 1)
        return
      }
      const tm = parsed.value
      // Retained message + wildcard bisa membawa perangkat lain.
      if (tm.device_id !== deviceId) return

      setLatest(tm)
      historyRef.current.add(tm)
      setHistory(historyRef.current.getAll())
      lastTsRef.current = tm.ts
      setState(deviceState(tm.ts))
      // Satu siklus baru mengganti notifikasi siklus lama, bukan menumpuknya.
      if (tm.status === 'UNFIT') {
        setAlerts(['UNFIT'])
      } else {
        setAlerts([])
      }
      setConnected(true)
    },
    [deviceId],
  )

  useEffect(() => {
    const client: MqttClient = createMqttClient(url, handleMessage, {
      username,
      password,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
    })
    client.connect()
    client.subscribe(`water_quality/${deviceId}/telemetry`)
    client.subscribe('water_quality/+/alert')

    // Status perangkat harus mengikuti usia `ts`, bukan koneksi MQTT.
    // Tanpa timer ini state akan tetap ONLINE walau board sudah tidur lama.
    const timer = window.setInterval(() => {
      const ts = lastTsRef.current
      if (ts != null) setState(deviceState(ts))
    }, 1000)

    return () => {
      window.clearInterval(timer)
      client.end()
      setConnected(false)
    }
  }, [url, deviceId, username, password, handleMessage])

  return { latest, history, state, connected, invalidCount, alerts }
}
