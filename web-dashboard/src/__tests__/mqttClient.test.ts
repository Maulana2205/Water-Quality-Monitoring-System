import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('mqtt', () => ({ connect: vi.fn() }))
import { connect as mqttConnect } from 'mqtt'

const mockedConnect = mqttConnect as unknown as ReturnType<typeof vi.fn>

import { createMqttClient } from '../services/mqttClient'

type FakeClient = {
  end: () => void
  subscribe: (topic: string) => void
  on: (...args: unknown[]) => void
  __handler?: (topic: string, payload: Buffer) => void
}

describe('mqttClient (mocked mqtt)', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('connects with the given url', () => {
    const fakeClient = {
      end: vi.fn(),
      subscribe: vi.fn(),
      on: vi.fn(),
    } as unknown as FakeClient
    mockedConnect.mockReturnValue(fakeClient)

    const client = createMqttClient('wss://broker:8084/mqtt')
    client.connect()

    expect(mockedConnect).toHaveBeenCalledWith('wss://broker:8084/mqtt', expect.any(Object))
  })

  it('subscribes to telemetry and alert topics', () => {
    const fakeClient = {
      end: vi.fn(),
      subscribe: vi.fn(),
      on: vi.fn(),
    } as unknown as FakeClient
    mockedConnect.mockReturnValue(fakeClient)

    const client = createMqttClient('wss://broker:8084/mqtt')
    client.connect()
    client.subscribe('water_quality/+/telemetry')
    client.subscribe('water_quality/+/alert')

    expect(fakeClient.subscribe).toHaveBeenCalledWith('water_quality/+/telemetry')
    expect(fakeClient.subscribe).toHaveBeenCalledWith('water_quality/+/alert')
  })

  it('delivers incoming messages to the callback', () => {
    const received: string[] = []
    let messageHandler = (() => {}) as (topic: string, payload: Buffer) => void
    const fakeClient = {
      end: vi.fn(),
      subscribe: vi.fn(),
      on: vi.fn((_event: string, handler: (topic: string, payload: Buffer) => void) => {
        if (_event === 'message') messageHandler = handler
      }),
    } as unknown as FakeClient
    mockedConnect.mockReturnValue(fakeClient)

    const client = createMqttClient('wss://broker:8084/mqtt', (topic, payload) => {
      received.push(`${topic}:${payload.toString()}`)
    })
    client.connect()

    messageHandler('water_quality/esp32_water_01/telemetry', Buffer.from('{"device_id":"x"}'))
    expect(received).toContain('water_quality/esp32_water_01/telemetry:{"device_id":"x"}')
  })

  it('end() disconnects cleanly', () => {
    const end = vi.fn()
    const fakeClient = {
      end,
      subscribe: vi.fn(),
      on: vi.fn(),
    } as unknown as FakeClient
    mockedConnect.mockReturnValue(fakeClient)

    const client = createMqttClient('wss://broker:8084/mqtt')
    client.connect()
    client.end()
    expect(end).toHaveBeenCalled()
  })
})
