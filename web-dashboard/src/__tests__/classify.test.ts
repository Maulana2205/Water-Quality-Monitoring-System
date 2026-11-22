import { describe, expect, it } from 'vitest'
import { classify, classifyParameter, thresholdLines, type Status } from '../lib/classify'

describe('classify (driven by shared/thresholds.json, Permenkes 2/2023)', () => {
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

  it('TDS exactly 300 (upper exclusive) -> UNFIT', () => {
    expect(classify(7, 300)).toBe('UNFIT')
  })

  it('TDS 999 -> UNFIT (no hygiene tier)', () => {
    expect(classify(7, 999)).toBe('UNFIT')
  })

  it('TDS at 1000 -> UNFIT', () => {
    expect(classify(7, 1000)).toBe('UNFIT')
  })

  it('worst parameter wins: TDS >= 300 overrides good pH', () => {
    expect(classify(7, 500)).toBe('UNFIT')
  })

  it('worst parameter wins: bad pH overrides everything', () => {
    expect(classify(9, 100)).toBe('UNFIT')
  })

  it('never emits HYGIENE_OK (identical physico-chemical limits)', () => {
    for (const tds of [0, 299, 300, 500, 1000]) {
      expect(classify(7, tds)).not.toBe('HYGIENE_OK')
    }
  })

  it('returns a valid Status enum', () => {
    const result: Status = classify(7, 100)
    expect(['DRINKABLE', 'HYGIENE_OK', 'UNFIT']).toContain(result)
  })
})

describe('classifyParameter (per-sensor status, no HYGIENE_OK tier)', () => {
  it('pH uses the same inclusive bounds', () => {
    expect(classifyParameter(6.5, 'ph')).toBe('DRINKABLE')
    expect(classifyParameter(8.5, 'ph')).toBe('DRINKABLE')
    expect(classifyParameter(6.49, 'ph')).toBe('UNFIT')
    expect(classifyParameter(8.51, 'ph')).toBe('UNFIT')
  })

  it('TDS is DRINKABLE below 300 and UNFIT from 300', () => {
    expect(classifyParameter(299, 'tds_ppm')).toBe('DRINKABLE')
    expect(classifyParameter(300, 'tds_ppm')).toBe('UNFIT')
  })

  it('temperature is not classified (option C)', () => {
    expect(classifyParameter(30.5, 'temperature')).toBeNull()
  })

  it('thresholdLines has only one TDS line, derived from thresholds.json', () => {
    expect(thresholdLines.tds_ppm).toEqual([300])
    expect(thresholdLines.ph).toEqual([6.5, 8.5])
  })
})
