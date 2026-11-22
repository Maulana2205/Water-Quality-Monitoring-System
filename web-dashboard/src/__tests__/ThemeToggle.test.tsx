import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ThemeToggle } from '../components/ThemeToggle'

afterEach(() => cleanup())

describe('ThemeToggle', () => {
  it('shows "aktifkan mode gelap" in light theme', () => {
    const onToggle = vi.fn()
    render(<ThemeToggle theme="light" onToggle={onToggle} />)
    const button = screen.getByRole('button', { name: 'Aktifkan mode gelap' })
    button.click()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('shows "aktifkan mode terang" in dark theme', () => {
    render(<ThemeToggle theme="dark" onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: 'Aktifkan mode terang' })).toBeTruthy()
  })
})
