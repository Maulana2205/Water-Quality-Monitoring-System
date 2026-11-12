import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('mqtt', () => ({ default: { connect: vi.fn() } }))
import mqtt from 'mqtt'

const mockedConnect = (mqtt as unknown as { connect: ReturnType<typeof vi.fn> }).connect

import { createMqttClient } from '../services/mqttClient'

type FakeClient = {
  end: () => void
  subscribe: (topic: string) => void
  on: (event: string, handler: unknown) => void
  handlers: Map<string, unknown>
}

function makeFakeClient(): FakeClient {
  const handlers = new Map<string, unknown>()
  const client = {
    end: vi.fn(),
    subscribe: vi.fn(),
    on: vi.fn((event: string, handler: unknown) => {
      handlers.set(event, handler)
    }),
    handlers,
  } as unknown as FakeClient
  return client
}

describe('mqttClient (mocked mqtt)', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('connects with the given url and options', () => {
    const client = makeFakeClient()
    mockedConnect.mockReturnValue(client)

    const c = createMqttClient('wss://broker:8084/mqtt')
    c.connect()

    expect(mockedConnect).toHaveBeenCalledWith('wss://broker:8084/mqtt', expect.any(Object))
  })

  it('subscribes to telemetry and alert topics', () => {
    const client = makeFakeClient()
    mockedConnect.mockReturnValue(client)

    const c = createMqttClient('wss://broker:8084/mqtt')
    c.connect()
    c.subscribe('water_quality/+/telemetry')
    c.subscribe('water_quality/+/alert')

    expect(client.subscribe).toHaveBeenCalledWith('water_quality/+/telemetry')
    expect(client.subscribe).toHaveBeenCalledWith('water_quality/+/alert')
  })

  it('delivers incoming messages to the callback', () => {
    const received: string[] = []
    const client = makeFakeClient()
    mockedConnect.mockReturnValue(client)

    const c = createMqttClient('wss://broker:8084/mqtt', (topic, payload) => {
      received.push(`${topic}:${payload.toString()}`)
    })
    c.connect()

    const handler = client.handlers.get('message') as (topic: string, payload: Buffer) => void
    handler('water_quality/esp32_water_01/telemetry', Buffer.from('{"device_id":"x"}'))
    expect(received).toContain('water_quality/esp32_water_01/telemetry:{"device_id":"x"}')
  })

  it('end() disconnects cleanly', () => {
    const client = makeFakeClient()
    mockedConnect.mockReturnValue(client)

    const c = createMqttClient('wss://broker:8084/mqtt')
    c.connect()
    c.end()
    expect(client.end).toHaveBeenCalled()
  })
})
