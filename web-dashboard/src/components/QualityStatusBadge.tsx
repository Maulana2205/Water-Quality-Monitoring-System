import type { TelemetryStatus } from '../lib/parseTelemetry'

const LABEL: Record<TelemetryStatus, string> = {
  DRINKABLE: 'LAYAK KONSUMSI',
  HYGIENE_OK: 'LAYAK CUCI/MANDI',
  UNFIT: 'TIDAK LAYAK',
}

const VARIANT: Record<TelemetryStatus, string> = {
  DRINKABLE: 'bg-green-100 text-green-800 border-green-200',
  HYGIENE_OK: 'bg-amber-100 text-amber-800 border-amber-200',
  UNFIT: 'bg-red-100 text-red-800 border-red-200',
}

/** Badge status kualitas air dengan label Bahasa Indonesia (hanya di UI). */
export function QualityStatusBadge({ status }: { status: TelemetryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${VARIANT[status]}`}
    >
      {LABEL[status]}
    </span>
  )
}
