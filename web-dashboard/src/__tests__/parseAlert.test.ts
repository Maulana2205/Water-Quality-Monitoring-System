import { describe, expect, it } from 'vitest'
import { parseAlert } from '../lib/parseAlert'

describe('parseAlert (zod, drop unknown reasons)', () => {
  it('parses known reasons', () => {
    expect(parseAlert({ reasons: ['PH_OUT_OF_RANGE', 'TDS_GT_MAX'] })).toEqual([
      'PH_OUT_OF_RANGE',
      'TDS_GT_MAX',
    ])
  })

  it('parses UNFIT legacy reason', () => {
    expect(parseAlert({ reasons: ['UNFIT'] })).toEqual(['UNFIT'])
  })

  it('rejects missing or non-array reasons', () => {
    expect(parseAlert({})).toBeNull()
    expect(parseAlert({ reasons: 'UNFIT' })).toBeNull()
  })

  it('rejects unknown reason strings', () => {
    expect(parseAlert({ reasons: ['HACK'] })).toBeNull()
  })

  it('rejects extra keys (strict)', () => {
    expect(parseAlert({ reasons: [], extra: 1 })).toBeNull()
  })
})
