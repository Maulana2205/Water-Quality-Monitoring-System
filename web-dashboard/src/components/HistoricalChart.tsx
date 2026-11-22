import { useState } from 'react'
import type { Telemetry } from '../lib/parseTelemetry'
import { Activity, Clock } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { deviceState } from '../lib/staleness'
import { classifyParameter, thresholdLines } from '../lib/classify'

const COLORS = {
  temperature: '#22c3ee', // cyan / biru
  ph: '#f59e0b', // amber / oranye
  tds_ppm: '#ef4444', // red / coral
}

const PARAM_UNIT: Record<string, string> = {
  temperature: '°C',
  ph: '',
  tds_ppm: 'ppm',
}

type Range = '1j' | '6j' | '12j' | '24j'


const RANGES: Array<{ value: Range; label: string }> = [
  { value: '1j', label: '1 Jam' },
  { value: '6j', label: '6 Jam' },
  { value: '12j', label: '12 Jam' },
  { value: '24j', label: '24 Jam' },
]

const HOURS: Record<Range, number> = { '1j': 1, '6j': 6, '12j': 12, '24j': 24 }

// Garis ambang per parameter, seluruhnya dari shared/thresholds.json via classify.ts.
const REF_LINES: Array<{
  yAxisId: string
  y: number
  label: string
  color: string
}> = [
  ...thresholdLines.ph.map((y) => ({ yAxisId: 'ph', y, label: `pH ${y}`, color: '#f59e0b' })),
  ...thresholdLines.tds_ppm.map((y) => ({
    yAxisId: 'tds_ppm',
    y,
    label: `TDS ${y}`,
    color: '#ef4444',
  })),
]

function formatWib(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function paramStatus(
  value: number,
  key: 'temperature' | 'ph' | 'tds_ppm',
): 'DRINKABLE' | 'HYGIENE_OK' | 'UNFIT' | 'NORMAL' {
  return classifyParameter(value, key) ?? 'NORMAL'
}

const STATUS_INDICATOR: Record<string, { dot: string; text: string }> = {
  DRINKABLE: { dot: 'bg-green-400', text: 'text-green-700 dark:text-green-400' },
  HYGIENE_OK: { dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
  UNFIT: { dot: 'bg-red-400', text: 'text-red-700 dark:text-red-400' },
  NORMAL: { dot: 'bg-cyan-400', text: 'text-cyan-700 dark:text-cyan-400' },
}

/** Tooltip gabungan: menampilkan waktu + ketiga nilai parameter pada titik yang sama. */
function GraphTooltip({
  active,
  tooltipItems,
  label,
}: {
  active?: boolean
  tooltipItems?: Array<{
    dataKey: string
    value: number
    name: string
    color: string
    payload: Telemetry
  }>
  label?: string | number
}) {
  if (!active || !tooltipItems?.length) return null
  const ts = (tooltipItems[0].payload as Telemetry).ts
  const time = typeof ts === 'number' ? formatWib(ts) : String(label ?? '')

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-3 rounded-xl shadow-lg text-sm backdrop-blur-sm">
      <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
        {time} WIB
      </div>
      {tooltipItems.map((item) => {
        const color = COLORS[item.dataKey as keyof typeof COLORS] ?? item.color
        return (
          <div key={item.dataKey} className="flex items-center gap-2.5 mb-1.5 last:mb-0">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="w-20 text-xs font-medium text-slate-500 dark:text-slate-400">
              {item.name}
            </span>
            <span className="ml-auto text-sm font-bold">
              {item.value} {PARAM_UNIT[item.dataKey] ?? ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Satu indikator metrik ringkasan (nilai terbaru + status). */
function MetricItem({
  label,
  value,
  unit,
  paramKey,
  latest,
}: {
  label: string
  value: number | null | undefined
  unit: string
  paramKey: 'temperature' | 'ph' | 'tds_ppm'
  latest: Telemetry | null
}) {
  const status = latest ? paramStatus(latest[paramKey], paramKey) : 'NORMAL'
  const dot = STATUS_INDICATOR[status].dot
  const text = STATUS_INDICATOR[status].text
  const show = value == null ? '–' : `${value} ${unit}`.trim()

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-1 bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-700/60`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
        <span className={`text-[0.7rem] font-bold uppercase tracking-wider ${text}`}>
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{show}</p>
    </div>
  )
}

/** Garis riwayat kualitas air (48 titik terakhir) dengan Recharts.
 *
 * Setiap parameter pakai sumbu Y independen (yAxisId) sehingga TDS tidak
 * menimpa suhu dan pH. Tooltip gabungan menampilkan ketiga nilai pada waktu
 * yang sama. Legend dapat diklik untuk menampilkan/menyembunyikan parameter.
 * Rentang waktu disaring di sisi klien (1/6/12/24 jam). */
export function HistoricalChart({ data }: { data: Telemetry[] }) {
  const [range, setRange] = useState<Range>('24j')
  const latest = data[data.length - 1] ?? null
  const latestTs = latest?.ts ?? 0
  const hours = HOURS[range]
  const filtered = data.filter((p) => latestTs - p.ts <= hours * 3600)
  const state = latest ? deviceState(latest.ts) : 'offline'
  const isLive = state === 'online'

  if (!data.length) {
    return (
      <div className="card animate-fade-in p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Activity size={20} strokeWidth={2} className="text-slate-500" />
        </div>
        <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-1">
          Belum ada data riwayat
        </h3>
        <p className="text-xs text-slate-400">
          Tunggu telemetry terbaru dari perangkat.
        </p>
      </div>
    )
  }

  return (
    <div className="card animate-fade-in overflow-hidden flex flex-col" role="region" aria-label="grafik riwayat kualitas air">
      {/* Header card */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Riwayat Kualitas Air</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoring parameter kualitas air selama {hours} jam terakhir.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              isLive
                ? 'border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-green-400 animate-pulse-ok' : 'bg-slate-400'
              }`}
              aria-hidden="true"
            />
            {isLive ? 'Live Monitoring' : 'Tidak ada data baru'}
          </span>
          {latest && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock size={12} strokeWidth={2} />
              Terakhir diperbarui {formatWib(latest.ts)} WIB
            </span>
          )}
        </div>
      </div>

      {/* Summary metrics */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700/60">
          <MetricItem
            label="Suhu"
            value={latest.temperature}
            unit="°C"
            paramKey="temperature"
            latest={latest}
          />
          <MetricItem label="TDS" value={latest.tds_ppm} unit="ppm" paramKey="tds_ppm" latest={latest} />
          <MetricItem label="pH" value={latest.ph} unit="" paramKey="ph" latest={latest} />
        </div>
      )}

      {/* Rentang waktu */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700/60">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
          Rentang waktu
        </p>
        <div className="flex gap-1.5">
          {RANGES.map((r) => {
            const active = range === r.value
            return (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  active
                    ? 'bg-water-600 text-white border-water-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grafik */}
      <div className="px-5 pb-5 flex-1 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filtered}
            margin={{ top: 10, right: 60, bottom: 34, left: 52 }}
          >
            <CartesianGrid strokeDasharray="1 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              tickCount={7}
              tickFormatter={formatWib}
              axisLine={false}
              tickLine={false}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              yAxisId="temperature"
              type="number"
              orientation="left"
              width={44}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(1)}
              allowDecimals
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="ph"
              type="number"
              orientation="right"
              width={44}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(1)}
              allowDecimals
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="tds_ppm"
              type="number"
              orientation="right"
              offset={48}
              width={52}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => Math.round(v).toString()}
              allowDecimals
              domain={['auto', 'auto']}
            />
            <Tooltip content={GraphTooltip} />
            <Legend verticalAlign="top" align="right" height={30} />
            {REF_LINES.map((r) => (
              <ReferenceLine
                key={`${r.yAxisId}-${r.y}`}
                yAxisId={r.yAxisId}
                y={r.y}
                stroke={r.color}
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: r.label,
                  position: 'end',
                  fill: r.color,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}
            <Line
              yAxisId="temperature"
              type="monotone"
              dataKey="temperature"
              stroke={COLORS.temperature}
              strokeWidth={2}
              dot={{ r: 3.5, fill: '#ffffff', stroke: COLORS.temperature, strokeWidth: 2 }}
              name="Suhu (°C)"
            />
            <Line
              yAxisId="ph"
              type="monotone"
              dataKey="ph"
              stroke={COLORS.ph}
              strokeWidth={2}
              dot={{ r: 3.5, fill: '#ffffff', stroke: COLORS.ph, strokeWidth: 2 }}
              name="pH"
            />
            <Line
              yAxisId="tds_ppm"
              type="monotone"
              dataKey="tds_ppm"
              stroke={COLORS.tds_ppm}
              strokeWidth={2}
              dot={{ r: 3.5, fill: '#ffffff', stroke: COLORS.tds_ppm, strokeWidth: 2 }}
              name="TDS (ppm)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
