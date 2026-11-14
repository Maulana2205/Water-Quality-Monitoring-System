import type { Telemetry } from '../lib/parseTelemetry'
import { Database, TrendingUp, Activity, Leaf } from 'lucide-react'

/** Ringkasan keberlanjutan: total pembacaan dan statistik TDS dari riwayat. */
export function SustainabilityPanel({ data }: { data: Telemetry[] }) {
  const count = data.length
  const avgTds = count ? Math.round(data.reduce((s, p) => s + p.tds_ppm, 0) / count) : 0
  const maxTds = count ? Math.max(...data.map((p) => p.tds_ppm)) : 0

  const metrics = [
    { label: 'Total pembacaan', value: String(count), icon: Database, color: 'text-slate-500 dark:text-slate-400' },
    { label: 'Rata-rata TDS', value: `${avgTds} ppm`, icon: TrendingUp, color: 'text-emerald-500 dark:text-emerald-400' },
    { label: 'TDS tertinggi', value: `Maks ${maxTds} ppm`, icon: Activity, color: 'text-slate-500 dark:text-slate-400' },
  ]

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm animate-fade-in">
      <div className="border-b border-slate-200 dark:border-slate-700/60 px-4 py-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Leaf size={14} strokeWidth={2} className="text-emerald-500 dark:text-emerald-400" />
          Keberlanjutan
        </h3>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
              <p className="text-sm font-bold">{m.value}</p>
            </div>
            <m.icon className={m.color} />
          </div>
        ))}
      </div>
      <p className="px-4 pt-3 text-xs text-slate-500 dark:text-slate-400">
        TDS rendah berarti air lebih mudah diproses dan hemat energi pengolahan.
      </p>
    </div>
  )
}
