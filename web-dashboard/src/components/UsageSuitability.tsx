import type { TelemetryStatus } from '../lib/parseTelemetry'
import { CheckCircle2, XCircle } from 'lucide-react'

const USES = ['Konsumsi', 'Mandi', 'Cuci baju'] as const

/**
 * Permenkes 2/2023 menetapkan BATU FISIK-KIMIA yang sama untuk air minum dan
 * air higiene & sanitasi (pH 6,5-8,5; TDS < 300 mg/L). Jadi ketiga guna ini
 * mengikuti satu ambang yang sama — tidak ada angka terpisah per penggunaan.
 */
export function UsageSuitability({ status }: { status: TelemetryStatus }) {
  const layak = status === 'DRINKABLE'

  return (
    <section
      role="group"
      aria-label="kelayakan penggunaan air"
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm animate-fade-in"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Kelayakan penggunaan
        </h3>
        <span className="text-[0.7rem] text-slate-400 dark:text-slate-500">Permenkes 2/2023</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {USES.map((use) => (
          <div
            key={use}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              layak
                ? 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20'
            }`}
          >
            {layak ? (
              <CheckCircle2 size={16} strokeWidth={2.2} className="text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <XCircle size={16} strokeWidth={2.2} className="text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{use}</p>
              <p className={`text-[0.7rem] font-medium ${layak ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {layak ? 'Layak' : 'Tidak layak'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[0.7rem] leading-snug text-slate-400 dark:text-slate-500">
        Ambang fisik-kimia berlaku sama untuk konsumsi, mandi, dan cuci baju (pH 6,5–8,5; TDS &lt; 300 ppm). Parameter mikrobiologi tidak diukur sensor.
      </p>
    </section>
  )
}
