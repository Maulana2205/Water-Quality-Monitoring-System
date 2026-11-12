import type { Telemetry } from '../lib/parseTelemetry'
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

import thresholds from '../lib/thresholds.json'

const COLORS = {
  temperature: '#22c3ee',
  turbidity_ntu: '#10b981',
  ph: '#f59e0b',
  tds_ppm: '#ef4444',
}

type ThresholdDoc = {
  parameters: {
    ph: { drinkable: { max: number }; hygiene_ok: { max: number } }
    tds_ppm: { drinkable: { max: number }; hygiene_ok: { max: number } }
    turbidity_ntu: { drinkable: { max: number }; hygiene_ok: { max: number } }
  }
}

const t = thresholds as ThresholdDoc

// Ambang batas yang digambar sebagai garis referensi (mirror shared/thresholds.json).
const REF_LINES = [
  { y: t.parameters.ph.drinkable.max, label: 'pH 8.5', color: '#f59e0b' },
  { y: t.parameters.tds_ppm.drinkable.max, label: 'TDS 300', color: '#ef4444' },
  { y: t.parameters.tds_ppm.hygiene_ok.max, label: 'TDS 1000', color: '#b91c1c' },
  { y: t.parameters.turbidity_ntu.drinkable.max, label: 'Kekeruhan 3', color: '#10b981' },
  { y: t.parameters.turbidity_ntu.hygiene_ok.max, label: 'Kekeruhan 25', color: '#047857' },
]

/* ponytail: semua parameter berbagi satu Y-axis, sehingga garis referensi pH
 * (skala ~0-14) tertekan di bawah saat TDS menempati skala 0-1000. Garis tetap
 * berguna sebagai indikator batas UNFIT. Perbaikan: sumbu Y terpisah per
 * parameter (ReCharts `yAxisId`). Ditambahkan saat diperlukan. */

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
          {REF_LINES.map((r, i) => (
            <ReferenceLine
              key={i}
              y={r.y}
              stroke={r.color}
              strokeDasharray="4 4"
              label={{ value: r.label, position: 'inside', fill: r.color, fontSize: 10 }}
            />
          ))}
          <Line type="monotone" dataKey="temperature" stroke={COLORS.temperature} name="Suhu (°C)" />
          <Line type="monotone" dataKey="turbidity_ntu" stroke={COLORS.turbidity_ntu} name="Kekeruhan (NTU)" />
          <Line type="monotone" dataKey="ph" stroke={COLORS.ph} name="pH" />
          <Line type="monotone" dataKey="tds_ppm" stroke={COLORS.tds_ppm} name="TDS (ppm)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
