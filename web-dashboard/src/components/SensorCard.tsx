import type { TelemetryStatus } from '../lib/parseTelemetry'
import type { LucideProps } from 'lucide-react'
import { Thermometer, FlaskConical, Gauge } from 'lucide-react'

const STATUS_COLOR: Record<TelemetryStatus, string> = {
  DRINKABLE: 'text-green-700 dark:text-green-400',
  HYGIENE_OK: 'text-amber-700 dark:text-amber-400',
  UNFIT: 'text-red-700 dark:text-red-400',
}

const STATUS_BAR: Record<TelemetryStatus, string> = {
  DRINKABLE: 'bg-green-400',
  HYGIENE_OK: 'bg-amber-400',
  UNFIT: 'bg-red-400',
}

const STATUS_DOT: Record<TelemetryStatus, string> = {
  DRINKABLE: 'bg-green-400',
  HYGIENE_OK: 'bg-amber-400',
  UNFIT: 'bg-red-400',
}

const STATUS_LABEL: Record<TelemetryStatus, string> = {
  DRINKABLE: 'Layak',
  HYGIENE_OK: 'Cuci/mandi',
  UNFIT: 'Tidak layak',
}

const COLOR_MISSING = 'text-slate-500 dark:text-slate-400'

const ICON: Record<string, React.ComponentType<LucideProps>> = {
  Suhu: Thermometer,
  pH: FlaskConical,
  TDS: Gauge,
}

const GAUGE_WIDTH: Record<TelemetryStatus, number> = {
  DRINKABLE: 100,
  HYGIENE_OK: 65,
  UNFIT: 25,
}

interface SensorCardProps {
  label: string
  value?: number | null | undefined
  unit: string
  status?: TelemetryStatus
}

/** Satu sensor dalam kartu lebar dan terpisah: ikon, nilai besar, chip status, dan indikator kualitas. */
export function SensorCard({ label, value, unit, status }: SensorCardProps) {
  const Icon = ICON[label] ?? Gauge
  const showValue = value == null ? '–' : `${value} ${unit}`.trim()
  const colorClass = status ? STATUS_COLOR[status] : COLOR_MISSING
  const width = status ? GAUGE_WIDTH[status] : 0

  return (
    <article className="card animate-fade-in group relative overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 w-2 ${status ? STATUS_BAR[status] : 'bg-slate-300 dark:bg-slate-700'}`}
        aria-hidden="true"
      />
      <div className="p-5 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-water-50 dark:bg-water-900/30 flex items-center justify-center text-water-600 dark:text-water-400 shadow-sm group-hover:scale-110 transition-transform">
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              {label}
            </h3>
          </div>
          {status && (
            <span className="flex items-center gap-1.5">
              <span className={`status-dot ${STATUS_DOT[status]} animate-pulse-ok`} aria-hidden="true" />
              <span className="text-[0.7rem] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none">
                {STATUS_LABEL[status]}
              </span>
            </span>
          )}
        </div>
        <p className={`mt-1 text-5xl font-extrabold tracking-tight ${colorClass}`}>{showValue}</p>
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kualitas air
            </span>
          </div>
          <div className="gauge-track">
            <div
              className={`gauge-fill ${status ? STATUS_BAR[status] : 'bg-slate-400'}`}
              style={{ width: `${width}%` }}
            />
          </div>
          <p className="mt-2 text-[0.7rem] text-slate-400 dark:text-slate-500 leading-none font-medium">
            {status ? STATUS_LABEL[status] : 'Tidak ada data'}
          </p>
        </div>
      </div>
    </article>
  )
}
