import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { DeviceStatus } from '../components/DeviceStatus'

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
})
