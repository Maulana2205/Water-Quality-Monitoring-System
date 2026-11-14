import { AlertCircle } from 'lucide-react'
import { DeviceStatus } from './components/DeviceStatus'
import { HistoricalChart } from './components/HistoricalChart'
import { QualityStatusBadge } from './components/QualityStatusBadge'
import { SensorCard } from './components/SensorCard'
import { SustainabilityPanel } from './components/SustainabilityPanel'
import { useTelemetry } from './hooks/useTelemetry'

const URL = import.meta.env.VITE_MQTT_BROKER_URL ?? 'wss://broker:8084/mqtt'
const DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? 'esp32_water_01'
const MQTT_USER = import.meta.env.VITE_MQTT_USER ?? undefined
const MQTT_PASS = import.meta.env.VITE_MQTT_PASS ?? undefined

const ALERT_LABEL: Record<string, string> = {
  PH_OUT_OF_RANGE: 'pH di luar batas',
  TDS_GT_MAX: 'TDS melebihi batas',
  UNFIT: 'Kualitas air tidak layak',
}

const SENSORS = [
  { label: 'Suhu', key: 'temperature', unit: '°C' },
  { label: 'Kekeruhan', key: 'turbidity_ntu', unit: 'NTU' },
  { label: 'pH', key: 'ph', unit: '' },
  { label: 'TDS', key: 'tds_ppm', unit: 'ppm' },
] as const

function lastUpdated(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function App() {
  const view = useTelemetry({
    url: URL,
    deviceId: DEVICE_ID,
    username: MQTT_USER,
    password: MQTT_PASS,
  })
  const latest = view.latest
  const history = view.history

  // Deteksi lompat seq antar dua pembacaan terakhir (siklus terlewat).
  const seqGap =
    history.length >= 2 &&
    history[history.length - 1].seq - history[history.length - 2].seq > 1

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 md:flex md:items-center md:justify-between shadow-sm animate-fade-in">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Water Quality Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitoring kualitas air IoT (ESP32 + EMQX Cloud).
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
              Terakhir diperbarui
            </p>
            <p className="text-sm font-semibold">
              {latest ? lastUpdated(latest.ts) : '–'}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              view.connected
                ? 'border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                view.connected ? 'bg-green-400 animate-pulse-ok' : 'bg-slate-400'
              }`}
              aria-hidden="true"
            />
            {view.connected ? 'Terhubung ke broker' : 'Terputus'}
          </span>
        </div>
      </header>

      {/* Alert banner (QoS 1) */}
      {view.alerts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-glow-bad animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} strokeWidth={2} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-800">
              <span className="font-bold">Peringatan:</span>{' '}
              {view.alerts.map((a) => ALERT_LABEL[a] ?? a).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Invalid message counter */}
      {view.invalidCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 shrink-0 mt-0.5">⚠</span>
            <p className="text-sm text-amber-800">
              {view.invalidCount} pesan tidak valid telah diabaikan.
            </p>
          </div>
        </div>
      )}

      {/* Status perangkat + kualitas air */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <DeviceStatus state={view.state} latest={latest} seqGap={seqGap} />
        {latest && <QualityStatusBadge status={latest.status} />}
      </div>

      {/* Kartu sensor — satu sensor per kartu lebar, tidak menumpuk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {latest ? (
          SENSORS.map((s) => (
            <SensorCard
              key={s.key}
              label={s.label}
              value={latest[s.key]}
              unit={s.unit}
              status={latest.status}
            />
          ))
        ) : (
          SENSORS.map((s) => (
            <SensorCard key={s.key} label={s.label} unit={s.unit} />
          ))
        )}
      </div>

      {/* Grafik riwayat + panel keberlanjutan */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HistoricalChart data={history} />
        </div>
        <SustainabilityPanel data={history} />
      </div>
    </div>
  )
}
