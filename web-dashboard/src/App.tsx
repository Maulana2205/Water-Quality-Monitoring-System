import { DeviceStatus } from './components/DeviceStatus'
import { HistoricalChart } from './components/HistoricalChart'
import { QualityStatusBadge } from './components/QualityStatusBadge'
import { SensorCard } from './components/SensorCard'
import { SustainabilityPanel } from './components/SustainabilityPanel'
import { useTelemetry } from './hooks/useTelemetry'

const URL = import.meta.env.VITE_MQTT_BROKER_URL ?? 'wss://broker:8084/mqtt'
const DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? 'esp32_water_01'

export default function App() {
  const view = useTelemetry({ url: URL, deviceId: DEVICE_ID })
  const latest = view.latest

  return (
    <div className="p-4 max-w-6xl mx-auto text-slate-900 dark:text-slate-100">
      <div className="flex flex-col md:flex-row gap-4 items-start mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Water Quality Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitoring kualitas air IoT (ESP32 + EMQX Cloud).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DeviceStatus state={view.state} />
          {latest && <QualityStatusBadge status={latest.status} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {latest ? (
          <>
            <SensorCard label="Suhu" value={latest.temperature} unit="°C" status={latest.status} />
            <SensorCard label="Kekeruhan" value={latest.turbidity_ntu} unit="NTU" status={latest.status} />
            <SensorCard label="pH" value={latest.ph} unit="" status={latest.status} />
            <SensorCard label="TDS" value={latest.tds_ppm} unit="ppm" status={latest.status} />
          </>
        ) : (
          <>
            <SensorCard label="Suhu" unit="°C" />
            <SensorCard label="Kekeruhan" unit="NTU" />
            <SensorCard label="pH" unit="" />
            <SensorCard label="TDS" unit="ppm" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HistoricalChart data={view.history} />
        </div>
        <div>
          <SustainabilityPanel data={view.history} />
        </div>
      </div>

      {view.invalidCount > 0 && (
        <div className="mt-4 p-3 rounded border bg-amber-50 text-amber-800 text-sm">
          {view.invalidCount} pesan tidak valid telah diabaikan.
        </div>
      )}
    </div>
  )
}
