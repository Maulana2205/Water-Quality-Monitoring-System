import { useState } from 'react'
import type { Telemetry } from '../lib/parseTelemetry'
import { Activity, Clock } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { deviceState } from '../lib/staleness'
import { classifyParameter, type SensorKey } from '../lib/classify'
import { timeDomain } from '../lib/chartDomain'
import { axisLabelFor, referenceLinesFor } from '../lib/chartConfig'

type Range = '1j' | '6j' | '12j' | '24j'

const RANGES: Array<{ value: Range; label: string }> = [
  { value: '1j', label: '1 Jam' },
  { value: '6j', label: '6 Jam' },
  { value: '12j', label: '12 Jam' },
  { value: '24j', label: '24 Jam' },
]

const HOURS: Record<Range, number> = { '1j': 1, '6j': 6, '12j': 12, '24j': 24 }

const COLORS = {
  temperature: '#22c3ee',
  ph: '#f59e0b',
  tds_ppm: '#ef4444',
}

function formatWib(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValue(value: number, key: SensorKey): string {
  if (key === 'temperature') return value.toFixed(1)
  if (key === 'ph') return value.toFixed(2)
  return Math.round(value).toString()
}

type StatusTone = 'DRINKABLE' | 'HYGIENE_OK' | 'UNFIT' | 'NORMAL'

const STATUS_INDICATOR: Record<StatusTone, { dot: string; text: string }> = {
  DRINKABLE: { dot: 'bg-green-400', text: 'text-green-700 dark:text-green-400' },
  HYGIENE_OK: { dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
  UNFIT: { dot: 'bg-red-400', text: 'text-red-700 dark:text-red-400' },
  NORMAL: { dot: 'bg-cyan-400', text: 'text-cyan-700 dark:text-cyan-400' },
}

function paramStatus(value: number, key: SensorKey): StatusTone {
  return classifyParameter(value, key) ?? 'NORMAL'
}

/** Tooltip sederhana untuk satu grafik: waktu + nilai satu parameter. */
function SingleTooltip({
  active,
  payload,
  label,
  sensorKey,
  unit,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: Telemetry }>
  label?: string | number
  sensorKey: SensorKey
  unit: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as Telemetry
  const time = typeof point?.ts === 'number' ? formatWib(point.ts) : String(label ?? '')
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg shadow-lg text-xs">
      <div className="font-semibold text-slate-600 dark:text-slate-200 mb-1">{time} WIB</div>
      <div className="font-bold">
        {formatValue(payload[0].value, sensorKey)} {unit}
      </div>
    </div>
  )
}

interface SensorChartProps {
  label: string
  unit: string
  sensorKey: SensorKey
  color: string
  data: Telemetry[]
  domain: [number, number]
  yDomain: [number | string, number | string]
  latestValue?: number
  showXAxis: boolean
}

/** Satu grafik untuk satu sensor — sumbu Y dan garis ambang sendiri. */
function SensorChart({
  label,
  unit,
  sensorKey,
  color,
  data,
  domain,
  yDomain,
  latestValue,
  showXAxis,
}: SensorChartProps) {
  const status = latestValue == null ? 'NORMAL' : paramStatus(latestValue, sensorKey)
  const lines = referenceLinesFor(sensorKey)

  return (
    <section
      role="region"
      aria-label={`grafik ${label}`}
      className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${STATUS_INDICATOR[status].dot}`} aria-hidden="true" />
          <h4 className={`text-xs font-bold uppercase tracking-wider ${STATUS_INDICATOR[status].text}`}>
            {label}
          </h4>
        </div>
        <span className="text-sm font-bold tabular-nums">
          {latestValue == null ? '–' : `${formatValue(latestValue, sensorKey)} ${unit}`.trim()}
        </span>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 6, right: 52, bottom: showXAxis ? 20 : 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={domain}
              hide={!showXAxis}
              minTickGap={28}
              tickFormatter={formatWib}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
              label={
                showXAxis
                  ? { value: 'Waktu (WIB)', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--chart-tick)' }
                  : undefined
              }
            />
            <YAxis
              orientation="right"
              width={52}
              domain={yDomain}
              tickFormatter={(v: number) => formatValue(v, sensorKey)}
              axisLine={false}
              tickLine={false}
              allowDecimals={sensorKey !== 'tds_ppm'}
              tick={{ fontSize: 10, fill: 'var(--chart-tick)' }}
              label={{ value: axisLabelFor(sensorKey), position: 'top', fontSize: 10, fill: 'var(--chart-tick)' }}
            />
            <Tooltip content={<SingleTooltip sensorKey={sensorKey} unit={unit} />} />
            {lines.map((line) => (
              <ReferenceLine
                key={line.y}
                y={line.y}
                stroke={line.color}
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: line.label, position: 'insideTopRight', fill: line.color, fontSize: 10 }}
              />
            ))}
            <Line
              type="linear"
              dataKey={sensorKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

/** Ringkasan satu metrik (nilai terbaru + status warna). */
function MetricItem({
  label,
  value,
  unit,
  paramKey,
}: {
  label: string
  value: number | null | undefined
  unit: string
  paramKey: SensorKey
}) {
  const status: StatusTone = value == null ? 'NORMAL' : paramStatus(value, paramKey)
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${STATUS_INDICATOR[status].dot}`} aria-hidden="true" />
        <span className={`text-[0.7rem] font-bold uppercase tracking-wider ${STATUS_INDICATOR[status].text}`}>
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight mt-1">
        {value == null ? '–' : `${formatValue(value, paramKey)} ${unit}`.trim()}
      </p>
    </div>
  )
}

export function HistoricalChart({ data }: { data: Telemetry[] }) {
  const [range, setRange] = useState<Range>('24j')
  const latest = data[data.length - 1] ?? null
  const latestTs = latest?.ts ?? 0
  const hours = HOURS[range]
  const filtered = data.filter((p) => latestTs - p.ts <= hours * 3600)
  const domain = timeDomain(filtered)
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
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Tunggu telemetry terbaru dari perangkat.
        </p>
      </div>
    )
  }

  return (
    <div className="card animate-fade-in overflow-hidden flex flex-col" role="region" aria-label="grafik riwayat kualitas air">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Riwayat Kualitas Air</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoring per sensor selama {hours} jam terakhir.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              isLive
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700/60">
        <MetricItem label="Suhu" value={latest?.temperature} unit="°C" paramKey="temperature" />
        <MetricItem label="pH" value={latest?.ph} unit="" paramKey="ph" />
        <MetricItem label="TDS" value={latest?.tds_ppm} unit="ppm" paramKey="tds_ppm" />
      </div>

      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700/60">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
          Rentang waktu
        </p>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                range === r.value
                  ? 'bg-water-600 text-white border-water-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4 pt-4">
        <SensorChart
          label="Suhu"
          unit="°C"
          sensorKey="temperature"
          color={COLORS.temperature}
          data={filtered}
          domain={domain}
          yDomain={['auto', 'auto']}
          latestValue={latest?.temperature}
          showXAxis={false}
        />
        <SensorChart
          label="pH"
          unit=""
          sensorKey="ph"
          color={COLORS.ph}
          data={filtered}
          domain={domain}
          yDomain={[0, 14]}
          latestValue={latest?.ph}
          showXAxis={false}
        />
        <SensorChart
          label="TDS"
          unit="ppm"
          sensorKey="tds_ppm"
          color={COLORS.tds_ppm}
          data={filtered}
          domain={domain}
          yDomain={[0, 'auto']}
          latestValue={latest?.tds_ppm}
          showXAxis
        />
      </div>
    </div>
  )
}
