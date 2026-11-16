import mqtt from 'mqtt'
import type { IClientOptions } from 'mqtt'

export interface MqttClient {
  connect: () => void
  subscribe: (topic: string) => void
  end: () => void
}

/**
 * MQTT-over-WSS client untuk dashboard (read-only: subscribe only, tanpa publish).
 * Auto-reconnect ditangani mqtt.js. Kredensial read-only dan tidak boleh
 * publish-capable (Vite env vars publik di bundle).
 */
export function createMqttClient(
  url: string,
  onMessage?: (topic: string, payload: Buffer) => void,
  opts?: {
    username?: string
    password?: string
    onConnect?: () => void
    onDisconnect?: () => void
  },
): MqttClient {
  let client: ReturnType<typeof mqtt.connect> | null = null

  const options: IClientOptions = {
    reconnectPeriod: 4000,
    keepalive: 60,
    clean: true,
    ...(opts?.username ? { username: opts.username } : {}),
    ...(opts?.password ? { password: opts.password } : {}),
  }

  function connect(): void {
    if (client) return
    client = mqtt.connect(url, options)
    if (onMessage) {
      client.on('message', (topic: string, payload: Buffer) => {
        onMessage(topic, payload)
      })
    }
    client.on('error', (err: Error) => {
      console.error('[mqtt] error:', err.message)
      opts?.onDisconnect?.()
    })
    client.on('connect', () => {
      console.log('[mqtt] connected')
      opts?.onConnect?.()
    })
    client.on('reconnect', () => {
      console.log('[mqtt] reconnecting...')
    })
    client.on('close', () => {
      opts?.onDisconnect?.()
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
