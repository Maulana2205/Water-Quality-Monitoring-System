import { connect as mqttConnect } from 'mqtt'
import type { IClientOptions, MqttClient as MqttJSClient } from 'mqtt'

export interface MqttClient {
  connect: () => void
  subscribe: (topic: string) => void
  end: () => void
}

/**
 * MQTT-over-WSS client for the dashboard (read-only: subscribe only, no publish).
 * Auto-reconnect is handled by mqtt.js. Credentials are read-only and must NOT
 * be publish-capable (Vite env vars are public in the bundle).
 */
export function createMqttClient(url: string, onMessage?: (topic: string, payload: Buffer) => void): MqttClient {
  let client: MqttJSClient | null = null

  const options: IClientOptions = {
    reconnectPeriod: 4000,
    keepalive: 60,
    clean: true,
  }

  function connect(): void {
    if (client) return
    client = mqttConnect(url, options)
    if (onMessage) {
      client.on('message', (topic: string, payload: Buffer) => {
        onMessage(topic, payload)
      })
    }
    client.on('error', () => {
      // reconnect handled by mqtt.js; surface via onStateChange if needed
    })
  }

  function subscribe(topic: string): void {
    client?.subscribe(topic)
  }

  function end(): void {
    client?.end()
    client = null
  }

  return { connect, subscribe, end }
}
