import { describe, expect, it } from 'vitest'
import { referenceLinesFor, axisLabelFor } from '../lib/chartConfig'

describe('referenceLinesFor (per-sensor threshold lines)', () => {
  it('pH has two lines from thresholds.json', () => {
    expect(referenceLinesFor('ph')).toEqual([
      { y: 6.5, label: 'pH 6.5', color: '#f59e0b' },
      { y: 8.5, label: 'pH 8.5', color: '#f59e0b' },
    ])
  })

  it('TDS has one line at 300 (legacy 1000 line is gone)', () => {
    expect(referenceLinesFor('tds_ppm')).toEqual([
      { y: 300, label: 'TDS 300', color: '#ef4444' },
    ])
  })

  it('temperature has no threshold lines (option C)', () => {
    expect(referenceLinesFor('temperature')).toEqual([])
  })
})

describe('axisLabelFor', () => {
  it('returns a readable label with unit for every sensor', () => {
    expect(axisLabelFor('temperature')).toBe('Suhu (°C)')
    expect(axisLabelFor('ph')).toBe('pH')
    expect(axisLabelFor('tds_ppm')).toBe('TDS (ppm)')
  })
})
