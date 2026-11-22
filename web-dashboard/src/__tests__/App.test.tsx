import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

vi.mock('../hooks/useTelemetry', () => ({ useTelemetry: vi.fn() }))
import { useTelemetry } from '../hooks/useTelemetry'
import App from '../App'

const mockUseTelemetry = useTelemetry as unknown as ReturnType<typeof vi.fn>

afterEach(() => {
  vi.resetAllMocks()
  cleanup()
})

describe('App', () => {
  it('menampilkan dashboard dengan telemetry terbaru', () => {
    mockUseTelemetry.mockReturnValue({
      latest: {
        device_id: 'esp32_water_01',
        ts: 1,
        seq: 1,
        temperature: 27.5,
        ph: 7.2,
        tds_ppm: 145,
        status: 'DRINKABLE',
      },
      history: [],
      state: 'online',
      connected: true,
      invalidCount: 0,
      alerts: [],
    })

    render(<App />)

    expect(screen.getByText('Water Quality Dashboard')).toBeTruthy()
    expect(screen.getByText('LAYAK')).toBeTruthy()
    expect(screen.getByText('ONLINE')).toBeTruthy()
    expect(screen.getByText('Suhu')).toBeTruthy()
    expect(screen.getByText('27.5 °C')).toBeTruthy()
  })

  it('menampilkan panel kelayakan untuk tiga guna', () => {
    mockUseTelemetry.mockReturnValue({
      latest: {
        device_id: 'esp32_water_01',
        ts: 1,
        seq: 1,
        temperature: 27.5,
        ph: 7.2,
        tds_ppm: 145,
        status: 'DRINKABLE',
      },
      history: [],
      state: 'online',
      connected: true,
      invalidCount: 0,
      alerts: [],
    })
    render(<App />)
    expect(screen.getByText('Kelayakan penggunaan')).toBeTruthy()
    expect(screen.getByText('Cuci baju')).toBeTruthy()
  })

  it('kartu TDS tetap hijau walaupun status overall UNFIT karena pH', () => {
    mockUseTelemetry.mockReturnValue({
      latest: {
        device_id: 'esp32_water_01',
        ts: 1,
        seq: 1,
        temperature: 27.5,
        ph: 9.1,
        tds_ppm: 111.6,
        status: 'UNFIT',
      },
      history: [],
      state: 'online',
      connected: true,
      invalidCount: 0,
      alerts: [],
    })
    render(<App />)
    const tdsValue = screen.getByText('111.6 ppm')
    expect(tdsValue.className).toContain('text-green-700')
  })

  it('menampilkan status offline dan pesan kosong ketika tidak ada data', () => {
    mockUseTelemetry.mockReturnValue({
      latest: null,
      history: [],
      state: 'offline',
      connected: false,
      invalidCount: 0,
      alerts: [],
    })

    render(<App />)

    expect(screen.getByText('OFFLINE')).toBeTruthy()
    expect(screen.getByText(/Belum ada data riwayat/)).toBeTruthy()
  })

  it('menampilkan banner peringatan saat ada alert', () => {
    mockUseTelemetry.mockReturnValue({
      latest: {
        device_id: 'esp32_water_01',
        ts: 1,
        seq: 1,
        temperature: 27.5,
        ph: 7.2,
        tds_ppm: 145,
        status: 'UNFIT',
      },
      history: [],
      state: 'online',
      connected: true,
      invalidCount: 0,
      alerts: ['PH_OUT_OF_RANGE'],
    })

    render(<App />)

    expect(screen.getByText('Peringatan:')).toBeTruthy()
    expect(screen.getByText('pH di luar batas')).toBeTruthy()
  })
})
