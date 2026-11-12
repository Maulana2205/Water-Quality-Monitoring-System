import { afterEach, describe, expect, it } from 'vitest'
import type { Telemetry } from '../lib/parseTelemetry'
import { History } from '../lib/history'

const KEY = 'water_quality_history'

function point(i: number): Telemetry {
  return {
    device_id: 'esp32_water_01',
    ts: 1767225600 + i,
    seq: i,
    temperature: 27 + i,
    turbidity_ntu: 1 + i,
    ph: 7.0,
    tds_ppm: 100 + i,
    status: 'HYGIENE_OK',
  }
}

function clearStorage() {
  localStorage.removeItem(KEY)
}

function setStorage(json: string) {
  localStorage.setItem(KEY, json)
}

describe('History (ring buffer 48, localStorage)', () => {
  afterEach(() => clearStorage())

  it('starts empty', () => {
    clearStorage()
    const h = new History()
    expect(h.size()).toBe(0)
    expect(h.getAll()).toEqual([])
  })

  it('keeps at most 48 points (ring buffer drops oldest)', () => {
    clearStorage()
    const h = new History()
    for (let i = 1; i <= 50; i++) h.add(point(i))
    expect(h.size()).toBe(48)
    const all = h.getAll()
    expect(all[0].seq).toBe(3) // 1 and 2 dropped
    expect(all[47].seq).toBe(50)
  })

  it('preserves insertion order', () => {
    clearStorage()
    const h = new History()
    for (let i = 1; i <= 10; i++) h.add(point(i))
    const seqs = h.getAll().map((p) => p.seq)
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('corrupted localStorage does not crash and starts empty', () => {
    setStorage('not valid json{{{')
    expect(() => new History()).not.toThrow()
    const h = new History()
    expect(h.size()).toBe(0)
  })

  it('valid localStorage hydrates on load', () => {
    setStorage(JSON.stringify([point(1), point(2)]))
    const h = new History()
    expect(h.size()).toBe(2)
    expect(h.getAll().map((p) => p.seq)).toEqual([1, 2])
  })
})
