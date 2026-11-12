import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Telemetry } from '../lib/parseTelemetry'
import { DeviceStatus } from '../components/DeviceStatus'

const latest: Telemetry = {
  device_id: 'esp32_water_01',
  ts: 1767225600,
  seq: 1,
  temperature: 27.5,
  turbidity_ntu: 12.0,
  ph: 7.2,
  tds_ppm: 145.0,
  status: 'HYGIENE_OK',
  rssi: -61,
  fw: '0.2.0',
}

afterEach(() => cleanup())

describe('DeviceStatus', () => {
  it('online -> hijau, ONLINE + Terhubung', () => {
    render(<DeviceStatus state="online" />)
    expect(screen.getByText('ONLINE')).toBeTruthy()
    expect(screen.getByText('Terhubung')).toBeTruthy()
    expect(screen.getByText('ONLINE').className).toContain('text-green-700')
  })

  it('stale -> kuning, STALE + Tidak segar', () => {
    render(<DeviceStatus state="stale" />)
    expect(screen.getByText('STALE')).toBeTruthy()
    expect(screen.getByText('Tidak segar')).toBeTruthy()
    expect(screen.getByText('STALE').className).toContain('text-amber-700')
  })

  it('offline -> merah, OFFLINE + Tidak terhubung', () => {
    render(<DeviceStatus state="offline" />)
    expect(screen.getByText('OFFLINE')).toBeTruthy()
    expect(screen.getByText('Tidak terhubung')).toBeTruthy()
    expect(screen.getByText('OFFLINE').className).toContain('text-red-700')
  })

  it('menampilkan RSSI dan versi firmware dari telemetry terbaru', () => {
    render(<DeviceStatus state="online" latest={latest} />)
    expect(screen.getByText(/-61 dBm/)).toBeTruthy()
    expect(screen.getByText(/FW 0\.2\.0/)).toBeTruthy()
  })

  it('menampilkan peringatan seq gap ketika berflag true', () => {
    render(<DeviceStatus state="online" latest={latest} seqGap={true} />)
    expect(screen.getByText(/Seq melompati siklus/)).toBeTruthy()
  })

  it('tidak menampilkan RSSI/FW ketika telemetry kosong', () => {
    render(<DeviceStatus state="offline" latest={null} />)
    expect(screen.queryByText('RSSI')).toBeNull()
    expect(screen.queryByText('FW')).toBeNull()
  })
})
