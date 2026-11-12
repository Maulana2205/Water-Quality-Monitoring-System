import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QualityStatusBadge } from '../components/QualityStatusBadge'

afterEach(() => cleanup())

describe('QualityStatusBadge', () => {
  it('DRINKABLE -> LAYAK KONSUMSI, hijau', () => {
    render(<QualityStatusBadge status="DRINKABLE" />)
    const badge = screen.getByText('LAYAK KONSUMSI')
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('bg-green-100')
    expect(badge.className).toContain('text-green-800')
  })

  it('HYGIENE_OK -> LAYAK CUCI/MANDI, kuning', () => {
    render(<QualityStatusBadge status="HYGIENE_OK" />)
    const badge = screen.getByText('LAYAK CUCI/MANDI')
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('bg-amber-100')
    expect(badge.className).toContain('text-amber-800')
  })

  it('UNFIT -> TIDAK LAYAK, merah', () => {
    render(<QualityStatusBadge status="UNFIT" />)
    const badge = screen.getByText('TIDAK LAYAK')
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('bg-red-100')
    expect(badge.className).toContain('text-red-800')
  })
})
