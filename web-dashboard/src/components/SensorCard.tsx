import type { TelemetryStatus } from '../lib/parseTelemetry'

const STATUS_COLOR: Record<TelemetryStatus, string> = {
  DRINKABLE: 'text-green-700 dark:text-green-400',
  HYGIENE_OK: 'text-amber-700 dark:text-amber-400',
  UNFIT: 'text-red-700 dark:text-red-400',
}

const COLOR_MISSING = 'text-slate-500 dark:text-slate-400'

interface SensorCardProps {
  label: string
  value?: number | null | undefined
  unit: string
  status?: TelemetryStatus
}

/** Kartu satu sensor: label, nilai + satuan, dan indikator warna status. */
export function SensorCard({ label, value, unit, status }: SensorCardProps) {
  const showValue = value == null ? '–' : `${value} ${unit}`.trim()
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-slate-900">
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </h3>
      <p className={`text-2xl font-bold ${status ? STATUS_COLOR[status] : COLOR_MISSING}`}>
        {showValue}
      </p>
    </div>
  )
}
