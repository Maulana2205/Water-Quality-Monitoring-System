import { describe, expect, it } from 'vitest'
import { classify, type Status } from '../lib/classify'

describe('classify (driven by shared/thresholds.json)', () => {
  it('pH lower bound inclusive -> DRINKABLE at 6.5', () => {
    expect(classify(6.5, 100)).toBe('DRINKABLE')
  })

  it('pH upper bound inclusive -> DRINKABLE at 8.5', () => {
    expect(classify(8.5, 100)).toBe('DRINKABLE')
  })

  it('pH just below 6.5 -> UNFIT', () => {
    expect(classify(6.49, 100)).toBe('UNFIT')
  })

  it('pH just above 8.5 -> UNFIT', () => {
    expect(classify(8.51, 100)).toBe('UNFIT')
  })

  it('TDS below 300 -> DRINKABLE', () => {
    expect(classify(7, 299)).toBe('DRINKABLE')
  })

  it('TDS exactly 300 (upper exclusive) -> HYGIENE_OK', () => {
    expect(classify(7, 300)).toBe('HYGIENE_OK')
  })

  it('TDS below 1000 -> HYGIENE_OK', () => {
    expect(classify(7, 999)).toBe('HYGIENE_OK')
  })

  it('TDS at 1000 -> UNFIT', () => {
    expect(classify(7, 1000)).toBe('UNFIT')
  })

  it('worst parameter wins: TDS hygiene overrides good pH', () => {
    expect(classify(7, 500)).toBe('HYGIENE_OK')
  })

  it('worst parameter wins: bad pH overrides everything', () => {
    expect(classify(9, 100)).toBe('UNFIT')
  })

  it('returns a valid Status enum', () => {
    const result: Status = classify(7, 100)
    expect(['DRINKABLE', 'HYGIENE_OK', 'UNFIT']).toContain(result)
  })
})
