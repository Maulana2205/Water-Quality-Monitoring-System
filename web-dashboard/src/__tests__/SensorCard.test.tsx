import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SensorCard } from '../components/SensorCard'

afterEach(() => cleanup())

describe('SensorCard', () => {
  it('renders label, value and unit', () => {
    render(<SensorCard label="Suhu" value={27.5} unit="°C" />)
    expect(screen.getByText('Suhu')).toBeTruthy()
    expect(screen.getByText('27.5 °C')).toBeTruthy()
  })

  it('applies status color to the value when status given', () => {
    render(<SensorCard label="pH" value={7.2} unit="" status="DRINKABLE" />)
    const value = screen.getByText('7.2')
    expect(value.className).toContain('text-green-700')
  })

  it('DRINKABLE label is LAYAK (physico-chemical only)', () => {
    render(<SensorCard label="pH" value={7.2} unit="" status="DRINKABLE" />)
    expect(screen.getAllByText('Layak').length).toBeGreaterThan(0)
    expect(screen.queryByText('Layak minum')).toBeNull()
  })

  it('renders "-" when value is missing', () => {
    render(<SensorCard label="TDS" unit="ppm" />)
    expect(screen.getByText('–')).toBeTruthy()
  })
})
