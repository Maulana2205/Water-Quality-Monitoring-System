import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import localThresholds from '../lib/thresholds.json'

describe('thresholds drift detection', () => {
  it('local mirror matches shared/thresholds.json (single source of truth)', () => {
    const sharedPath = path.resolve(process.cwd(), '../shared/thresholds.json')
    const shared = JSON.parse(fs.readFileSync(sharedPath, 'utf-8'))
    expect(localThresholds).toEqual(shared)
  })
})
