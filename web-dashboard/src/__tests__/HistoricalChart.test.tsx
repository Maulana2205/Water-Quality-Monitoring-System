import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Telemetry } from '../lib/parseTelemetry'
import { HistoricalChart } from '../components/HistoricalChart'

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

describe('HistoricalChart', () => {
  it('menampilkan pesan kosong ketika tidak ada data', () => {
    render(<HistoricalChart data={[]} />)
    expect(screen.getByText(/Belum ada data riwayat/)).toBeTruthy()
  })

  it('merender region grafik saat data tersedia (tanpa pesan kosong)', () => {
    render(<HistoricalChart data={[base, { ...base, seq: 2, ts: base.ts + 300 }]} />)
    expect(screen.getByRole('region', { name: /grafik/ })).toBeTruthy()
    expect(screen.queryByText(/Belum ada data riwayat/)).toBeNull()
  })
})
