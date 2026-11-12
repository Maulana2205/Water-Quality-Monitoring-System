import type { Telemetry } from '../lib/parseTelemetry'

/** Ringkasan keberlanjutan: total pembacaan dan rata-rata TDS dari riwayat. */
export function SustainabilityPanel({ data }: { data: Telemetry[] }) {
  const count = data.length
  const avgTds = count ? Math.round(data.reduce((s, p) => s + p.tds_ppm, 0) / count) : 0

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-slate-900">
      <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
        Keberlanjutan
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Total pembacaan</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Rata-rata TDS</p>
          <p className="text-2xl font-bold">{avgTds} ppm</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        TDS rendah berarti air lebih mudah diproses dan hemat energi pengolahan.
      </p>
    </div>
  )
}
