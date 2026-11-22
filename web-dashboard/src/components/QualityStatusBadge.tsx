import type { TelemetryStatus } from '../lib/parseTelemetry'
import type { LucideProps } from 'lucide-react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

const LABEL: Record<TelemetryStatus, string> = {
  DRINKABLE: 'LAYAK',
  HYGIENE_OK: 'LAYAK CUCI/MANDI',
  UNFIT: 'TIDAK LAYAK',
}

const VARIANT: Record<TelemetryStatus, string> = {
  DRINKABLE: 'bg-green-100 text-green-800 border-green-200 shadow-glow-ok',
  HYGIENE_OK: 'bg-amber-100 text-amber-800 border-amber-200 shadow-glow-warn',
  UNFIT: 'bg-red-100 text-red-800 border-red-200 shadow-glow-bad',
}

const ICON: Record<TelemetryStatus, React.ComponentType<LucideProps>> = {
  DRINKABLE: CheckCircle2,
  HYGIENE_OK: CheckCircle2,
  UNFIT: AlertCircle,
}

/** Badge status kualitas air dengan label Bahasa Indonesia (hanya di UI). */
export function QualityStatusBadge({ status }: { status: TelemetryStatus }) {
  const Icon = ICON[status]
  return (
    <span
      title="Kelayakan fisik-kimia (pH, TDS, suhu). Parameter mikrobiologi tidak diukur sensor."
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border shadow-sm ${VARIANT[status]}`}
    >
      <Icon size={12} strokeWidth={2} className="mr-1.5 shrink-0" />
      {LABEL[status]}
    </span>
  )
}
