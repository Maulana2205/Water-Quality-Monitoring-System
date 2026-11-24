import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Telemetry } from '../lib/parseTelemetry'
import { SustainabilityPanel } from '../components/SustainabilityPanel'

const base: Telemetry = {
  device_id: 'esp32_water_01',
  ts: 1767225600,
  seq: 1,
  temperature: 27.5,
  ph: 7.2,
  tds_ppm: 145.0,
  status: 'HYGIENE_OK',
}

afterEach(() => cleanup())

describe('SustainabilityPanel', () => {
  it('menampilkan total pembacaan dan rata-rata TDS', () => {
    render(<SustainabilityPanel data={[base, { ...base, seq: 2, tds_ppm: 300 }]} />)
    expect(screen.getByText('Total pembacaan')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText(/Rata-rata TDS/)).toBeTruthy()
    expect(screen.getByText('223 ppm')).toBeTruthy()
  })

  it('memakai arus dan kapasitas hasil ukur (214 mA, 13,5 mA, 800 mAh)', () => {
    const point = { ...base, active_time_ms: 11000 }
    render(<SustainabilityPanel data={[point]} />)
    // 48 × [(3,7×214×11)/3600 + (3,7×13,5×1789)/3600] ≈ 1308 mWh/hari
    expect(screen.getByText('1308 mWh')).toBeTruthy()
    // 800 mAh × 3,7 V / 1307,6 mWh ≈ 2,3 hari
    expect(screen.getByText('2.3 hari')).toBeTruthy()
  })

  it('menampilkan nol ketika tidak ada data', () => {
    render(<SustainabilityPanel data={[]} />)
    expect(screen.getByText('Total pembacaan')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
    expect(screen.getByText('0 ppm')).toBeTruthy()
  })
})
