import { describe, expect, it } from 'vitest'
import { resolveInitialTheme } from '../lib/theme'

describe('resolveInitialTheme', () => {
  it('uses stored preference over system', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  it('falls back to system preference when nothing stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignores invalid stored values', () => {
    expect(resolveInitialTheme('auto', true)).toBe('dark')
    expect(resolveInitialTheme('', false)).toBe('light')
  })
})
