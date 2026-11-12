import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deviceState, type DeviceState } from '../lib/staleness'

const MIN = 60

describe('deviceState (staleness)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const nowSec = () => Math.floor(Date.now() / 1000)

  it('recent reading -> online', () => {
    expect(deviceState(nowSec())).toBe('online')
  })

  it('44 minutes ago -> online', () => {
    expect(deviceState(nowSec() - 44 * MIN)).toBe('online')
  })

  it('boundary: exactly 45 minutes ago -> stale', () => {
    expect(deviceState(nowSec() - 45 * MIN)).toBe('stale')
  })

  it('boundary: 89 minutes ago -> stale', () => {
    expect(deviceState(nowSec() - 89 * MIN)).toBe('stale')
  })

  it('boundary: exactly 90 minutes ago -> stale', () => {
    expect(deviceState(nowSec() - 90 * MIN)).toBe('stale')
  })

  it('91 minutes ago -> offline', () => {
    expect(deviceState(nowSec() - 91 * MIN)).toBe('offline')
  })

  it('future ts -> online', () => {
    expect(deviceState(nowSec() + 100)).toBe('online')
  })

  it('returns a valid DeviceState enum', () => {
    const s: DeviceState = deviceState(nowSec())
    expect(['online', 'stale', 'offline']).toContain(s)
  })
})
