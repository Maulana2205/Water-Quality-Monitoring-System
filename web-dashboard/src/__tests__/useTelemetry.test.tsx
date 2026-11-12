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
  turbidity_ntu: 12.0,
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

  it('disconnects client on unmount', () => {
    const { unmount } = renderHook(() => useTelemetry({ url: 'wss://broker:8084/mqtt', deviceId: 'esp32_water_01' }))
    const client = mockCreateMqttClient.mock.results[0].value as { end: ReturnType<typeof vi.fn> }
    unmount()
    expect(client.end).toHaveBeenCalled()
  })
})
