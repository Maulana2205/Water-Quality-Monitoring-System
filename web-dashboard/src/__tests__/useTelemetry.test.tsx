import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../services/mqttClient', () => ({ createMqttClient: vi.fn() }))
import { createMqttClient } from '../services/mqttClient'
import { useTelemetry } from '../hooks/useTelemetry'

const mockCreateMqttClient = createMqttClient as unknown as ReturnType<typeof vi.fn>

let onMessage: ((topic: string, payload: Buffer) => void) | null = null

const validTelemetry = {
  device_id: 'esp32_water_01',
  ts: Math.floor(Date.now() / 1000),
  seq: 1,
  temperature: 27.5,
  ph: 7.2,
  tds_ppm: 145.0,
  status: 'HYGIENE_OK' as const,
  active_time_ms: 18400,
  rssi: -61,
  fw: '0.2.0',
}

beforeEach(() => {
  localStorage.removeItem('water_quality_history')
  onMessage = null
  mockCreateMqttClient.mockImplementation((_url: string, cb?: (t: string, p: Buffer) => void) => {
    onMessage = cb ?? null
    return { connect: vi.fn(), subscribe: vi.fn(), end: vi.fn() }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useTelemetry', () => {
  it('starts offline with no data', () => {
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    expect(result.current.latest).toBeNull()
    expect(result.current.state).toBe('offline')
    expect(result.current.invalidCount).toBe(0)
    expect(result.current.history).toEqual([])
    expect(mockCreateMqttClient).toHaveBeenCalledTimes(1)
    expect(mockCreateMqttClient.mock.calls[0][0]).toBe('wss://broker:8084/mqtt')
  })

  it('subscribes to device telemetry and alert topics', () => {
    renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    const client = mockCreateMqttClient.mock.results[0].value as { subscribe: ReturnType<typeof vi.fn> }
    expect(client.subscribe).toHaveBeenCalledWith('water_quality/esp32_water_01/telemetry')
    expect(client.subscribe).toHaveBeenCalledWith('water_quality/+/alert')
  })

  it('valid message updates latest, history and state to online', () => {
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    act(() => {
      onMessage?.('water_quality/esp32_water_01/telemetry', Buffer.from(JSON.stringify(validTelemetry)))
    })
    expect(result.current.latest?.device_id).toBe('esp32_water_01')
    expect(result.current.state).toBe('online')
    expect(result.current.history).toHaveLength(1)
    expect(result.current.invalidCount).toBe(0)
  })

  it('invalid message is dropped and counted (latest unchanged)', () => {
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    act(() => {
      onMessage?.('water_quality/esp32_water_01/telemetry', Buffer.from('not json'))
    })
    expect(result.current.latest).toBeNull()
    expect(result.current.invalidCount).toBe(1)
    expect(result.current.history).toHaveLength(0)
  })

  it('does not duplicate UNFIT alert on repeated telemetry', () => {
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    const unfit = Buffer.from(JSON.stringify({ ...validTelemetry, status: 'UNFIT' }))
    act(() => {
      onMessage?.('water_quality/esp32_water_01/telemetry', unfit)
      onMessage?.('water_quality/esp32_water_01/telemetry', unfit)
    })
    expect(result.current.alerts.filter((a) => a === 'UNFIT')).toHaveLength(1)
  })

  it('ignores alerts from other devices', () => {
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    act(() => {
      onMessage?.(
        'water_quality/esp32_water_99/alert',
        Buffer.from(JSON.stringify({ reasons: ['PH_OUT_OF_RANGE'] })),
      )
    })
    expect(result.current.alerts).toEqual([])
  })

  it('accepts a valid alert from own device and counts invalid payloads', () => {
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    act(() => {
      onMessage?.(
        'water_quality/esp32_water_01/alert',
        Buffer.from(JSON.stringify({ reasons: ['TDS_GT_MAX'] })),
      )
    })
    expect(result.current.alerts).toEqual(['TDS_GT_MAX'])
    act(() => {
      onMessage?.('water_quality/esp32_water_01/alert', Buffer.from('not json'))
    })
    expect(result.current.invalidCount).toBe(1)
  })

  it('replaces alerts from the previous cycle when new telemetry arrives', () => {
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    act(() => {
      onMessage?.(
        'water_quality/esp32_water_01/alert',
        Buffer.from(JSON.stringify({ reasons: ['TDS_GT_MAX'] })),
      )
    })
    expect(result.current.alerts).toEqual(['TDS_GT_MAX'])

    act(() => {
      onMessage?.(
        'water_quality/esp32_water_01/telemetry',
        Buffer.from(JSON.stringify({ ...validTelemetry, seq: 2, status: 'DRINKABLE' })),
      )
    })
    expect(result.current.alerts).toEqual([])
  })

  it('state becomes stale then offline without a new message', () => {
    vi.useFakeTimers()
    const start = new Date('2026-01-01T00:00:00Z')
    vi.setSystemTime(start)
    const tm = { ...validTelemetry, ts: Math.floor(start.getTime() / 1000), status: 'DRINKABLE' as const }
    const { result } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    act(() => {
      onMessage?.('water_quality/esp32_water_01/telemetry', Buffer.from(JSON.stringify(tm)))
    })
    expect(result.current.state).toBe('online')

    act(() => {
      vi.setSystemTime(start.getTime() + 46 * 60 * 1000)
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.state).toBe('stale')

    act(() => {
      vi.setSystemTime(start.getTime() + 91 * 60 * 1000)
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.state).toBe('offline')
  })

  it('disconnects client on unmount', () => {
    const { unmount } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    const client = mockCreateMqttClient.mock.results[0].value as { end: ReturnType<typeof vi.fn> }
    unmount()
    expect(client.end).toHaveBeenCalled()
  })
})
