import { useCallback, useEffect, useRef, useState } from 'react'
import type { Telemetry } from '../lib/parseTelemetry'
import { parseTelemetry } from '../lib/parseTelemetry'
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

export function useTelemetry({
  url,
  deviceId,
  username,
  password,
}: UseTelemetryOptions): TelemetryView {
  const [latest, setLatest] = useState<Telemetry | null>(null)
  const [state, setState] = useState<DeviceState>('offline')
  const [connected, setConnected] = useState(false)
  const [invalidCount, setInvalidCount] = useState(0)
  const [alerts, setAlerts] = useState<string[]>([])

  const historyRef = useRef(new History())
  const clientRef = useRef<MqttClient | null>(null)

  const handleMessage = useCallback((topic: string, payload: Buffer) => {
    if (topic.endsWith('/alert')) {
      try {
        const text = payload.toString()
        const obj = JSON.parse(text)
        if (Array.isArray(obj.reasons)) {
          setAlerts((a) => [...a.slice(-9), ...obj.reasons])
        }
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
    // Only track this dashboard's device (retained message + wildcard may bring others).
    if (tm.device_id !== deviceId) return

    setLatest(tm)
    historyRef.current.add(tm)
    setState(deviceState(tm.ts))
    if (tm.status === 'UNFIT') {
      setAlerts((a) => [...a.slice(-9), 'UNFIT'])
    }
    setConnected(true)
  }, [deviceId])

  useEffect(() => {
    const client = createMqttClient(url, handleMessage, {
      username,
      password,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
    })
    clientRef.current = client
    client.connect()
    client.subscribe(`water_quality/${deviceId}/telemetry`)
    client.subscribe('water_quality/+/alert')
    return () => {
      client.end()
      clientRef.current = null
      setConnected(false)
    }
  }, [url, deviceId, handleMessage])

  return {
    latest,
    history: historyRef.current.getAll(),
    state,
    connected,
    invalidCount,
    alerts,
  }
}
