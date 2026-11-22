import { describe, expect, it } from 'vitest'
import { timeDomain } from '../lib/chartDomain'
import type { Telemetry } from '../lib/parseTelemetry'

function point(ts: number): Telemetry {
  return {
    device_id: 'esp32_water_01',
    ts,
    seq: ts,
    temperature: 27.5,
    ph: 7.2,
    tds_ppm: 145,
    status: 'DRINKABLE',
  }
}

describe('timeDomain (XAxis numeric domain for epoch timestamps)', () => {
  it('returns [0, 0] for empty data', () => {
    expect(timeDomain([])).toEqual([0, 0])
  })

  it('uses the actual min/max timestamp instead of Recharts default [0, auto]', () => {
    expect(timeDomain([point(100), point(300), point(200)])).toEqual([100, 300])
  })

  it('widens a single point into a visible window', () => {
    expect(timeDomain([point(1795000000)])).toEqual([1794999999, 1795000001])
  })
})
