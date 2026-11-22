import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { UsageSuitability } from '../components/UsageSuitability'

afterEach(() => cleanup())

describe('UsageSuitability (one Permenkes threshold, three usage labels)', () => {
  it('DRINKABLE -> layak untuk konsumsi, mandi, dan cuci baju', () => {
    render(<UsageSuitability status="DRINKABLE" />)
    expect(screen.getByText('Konsumsi')).toBeTruthy()
    expect(screen.getByText('Mandi')).toBeTruthy()
    expect(screen.getByText('Cuci baju')).toBeTruthy()
    expect(screen.getAllByText('Layak')).toHaveLength(3)
    expect(screen.queryByText('Tidak layak')).toBeNull()
  })

  it('UNFIT -> tidak layak untuk ketiga penggunaan', () => {
    render(<UsageSuitability status="UNFIT" />)
    expect(screen.getAllByText('Tidak layak')).toHaveLength(3)
    expect(screen.queryByText('Layak')).toBeNull()
  })

  it('menjelaskan bahwa ambang fisik-kimia sama untuk ketiga guna', () => {
    render(<UsageSuitability status="DRINKABLE" />)
    expect(screen.getByText(/berlaku sama/i)).toBeTruthy()
  })
})
