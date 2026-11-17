import type { Telemetry } from '../lib/parseTelemetry'
import { Database, TrendingUp, Activity, Leaf, Clock, Zap, BatteryCharging } from 'lucide-react'

// ponytail: angka di bawah ini PERKIRAAN sementara. Ganti dengan hasil ukur
// P_sleep di Phase 6 (sesuai plan.md §2c) — stock ESP32 DevKit idles jauh di
// atas target 0.75 mA karena USB-UART/LDO/power LED, jadi arus "naik" saat
// deep sleep itu wajar. Semua turunan (energi, umur baterai) dihitung dari sini.
const VOLTAGE_V = 3.7 // baterai 18650 nominal
const ACTIVE_MA = 120 // ≈ 0.444 W @ 3.7 V (budget plan.md §2c)
const SLEEP_MA = 15 // placeholder DevKit stock (arus naik saat deep sleep)
const CAPACITY_MAH = 3000 // 18650
const CYCLE_S = 30 * 60 // 1 siklus / 30 menit (48 siklus/hari)

function energyMwh(voltageV: number, milliamps: number, seconds: number): number {
  // V * mA = mW; mW * s = mJ; 1 mWh = 3600 mJ
  return (voltageV * milliamps * seconds) / 3600
}

interface Metric {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

/** Ringkasan keberlanjutan: statistik TDS + estimasi energi/umur baterai. */
export function SustainabilityPanel({ data }: { data: Telemetry[] }) {
  const count = data.length
  const avgTds = count ? Math.round(data.reduce((s, p) => s + p.tds_ppm, 0) / count) : 0
  const maxTds = count ? Math.max(...data.map((p) => p.tds_ppm)) : 0

  const activeMs = count
    ? data.reduce((s, p) => s + (p.active_time_ms ?? 11000), 0) / count
    : 11000
  const tActiveS = activeMs / 1000
  const dutyCycle = (tActiveS / CYCLE_S) * 100
  const energyDayMwh =
    48 * (energyMwh(VOLTAGE_V, ACTIVE_MA, tActiveS) +
      energyMwh(VOLTAGE_V, SLEEP_MA, CYCLE_S - tActiveS))
  const capacityMwh = CAPACITY_MAH * VOLTAGE_V
  const batteryLifeDays = energyDayMwh > 0 ? capacityMwh / energyDayMwh : 0

  const historyMetrics: Metric[] = [
    { label: 'Total pembacaan', value: String(count), icon: Database, color: 'text-slate-500 dark:text-slate-400' },
    { label: 'Rata-rata TDS', value: `${avgTds} ppm`, icon: TrendingUp, color: 'text-emerald-500 dark:text-emerald-400' },
    { label: 'TDS tertinggi', value: `Maks ${maxTds} ppm`, icon: Activity, color: 'text-slate-500 dark:text-slate-400' },
  ]

  const energyMetrics: Metric[] = [
    { label: 'Active window (rata-rata)', value: `${(tActiveS).toFixed(1)} s`, icon: Clock, color: 'text-cyan-500 dark:text-cyan-400' },
    { label: 'Duty cycle', value: `${dutyCycle.toFixed(2)} %`, icon: Zap, color: 'text-amber-500 dark:text-amber-400' },
    { label: 'Estimasi energi/hari', value: `${energyDayMwh.toFixed(0)} mWh`, icon: Activity, color: 'text-emerald-500 dark:text-emerald-400' },
    { label: 'Estimasi umur baterai', value: `${batteryLifeDays.toFixed(1)} hari`, icon: BatteryCharging, color: 'text-rose-500 dark:text-rose-400' },
  ]

  const renderRow = (m: Metric) => (
    <div key={m.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
        <p className="text-sm font-bold">{m.value}</p>
      </div>
      <m.icon className={m.color} />
    </div>
  )

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm animate-fade-in">
      <div className="border-b border-slate-200 dark:border-slate-700/60 px-4 py-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Leaf size={14} strokeWidth={2} className="text-emerald-500 dark:text-emerald-400" />
          Keberlanjutan
        </h3>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {historyMetrics.map(renderRow)}
        <p className="pt-2 text-[0.7rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Estimasi energi (perkiraan)
        </p>
        {energyMetrics.map(renderRow)}
      </div>
      <p className="px-4 pt-3 text-xs text-slate-500 dark:text-slate-400">
        Angka energi & umur baterai adalah <strong>perkiraan</strong> — akan diperbarui dengan pengukuran P_sleep aktual (Phase 6). TDS rendah berarti air lebih mudah diproses dan hemat energi pengolahan.
      </p>
    </div>
  )
}