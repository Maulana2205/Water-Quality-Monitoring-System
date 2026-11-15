import { describe, expect, it } from 'vitest'
import { parseTelemetry, ParseTelemetryError } from '../lib/parseTelemetry'

describe('parseTelemetry', () => {
  const valid = {
    device_id: 'esp32_water_01',
    ts: 1767225600,
    seq: 128,
    temperature: 27.5,
    ph: 7.2,
    tds_ppm: 145.0,
    status: 'HYGIENE_OK' as const,
    active_time_ms: 18400,
    rssi: -61,
    fw: '0.2.0',
  }

  it('accepts a valid telemetry payload', () => {
    const result = parseTelemetry(valid)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.device_id).toBe('esp32_water_01')
      expect(result.value.status).toBe('HYGIENE_OK')
    }
  })

  it('rejects payload missing a required field', () => {
    const { ts: _ts, ...rest } = valid
    const result = parseTelemetry(rest as never)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ParseTelemetryError)
    }
  })

  it('rejects payload with wrong field type', () => {
    const result = parseTelemetry({ ...valid, ts: 'not-a-number' as never })
    expect(result.ok).toBe(false)
  })

  it('rejects unknown status value', () => {
    const result = parseTelemetry({ ...valid, status: 'LAYAK KONSUMSI' as never })
    expect(result.ok).toBe(false)
  })

  it('rejects non-object input', () => {
    expect(parseTelemetry(null as never).ok).toBe(false)
    expect(parseTelemetry(undefined as never).ok).toBe(false)
    expect(parseTelemetry('json string' as never).ok).toBe(false)
  })
})
