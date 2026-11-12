import type { Telemetry } from '../lib/parseTelemetry'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const COLORS = {
  temperature: '#22c3ee',
  turbidity_ntu: '#10b981',
  ph: '#f59e0b',
  tds_ppm: '#ef4444',
}

/** Garis riwayat telemetry (48 titik terakhir) dengan Recharts. */
export function HistoricalChart({ data }: { data: Telemetry[] }) {
  if (!data.length) {
    return (
      <div className="rounded-lg border p-4 text-slate-500">
        Belum ada data riwayat
      </div>
    )
  }

  return (
    <div className="h-64" role="region" aria-label="grafik riwayat kualitas air">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" label={{ value: 'Waktu', position: 'insideBottomRight' }} />
          <YAxis label={{ value: 'Nilai', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="temperature" stroke={COLORS.temperature} name="Suhu (°C)" />
          <Line type="monotone" dataKey="turbidity_ntu" stroke={COLORS.turbidity_ntu} name="Kekeruhan (NTU)" />
          <Line type="monotone" dataKey="ph" stroke={COLORS.ph} name="pH" />
          <Line type="monotone" dataKey="tds_ppm" stroke={COLORS.tds_ppm} name="TDS (ppm)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
