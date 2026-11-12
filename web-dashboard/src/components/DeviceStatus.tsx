import type { Telemetry } from '../lib/parseTelemetry'
import type { DeviceState } from '../lib/staleness'

const LABEL: Record<DeviceState, { status: string; keterangan: string }> = {
  online: { status: 'ONLINE', keterangan: 'Terhubung' },
  stale: { status: 'STALE', keterangan: 'Tidak segar' },
  offline: { status: 'OFFLINE', keterangan: 'Tidak terhubung' },
}

const VARIANT: Record<DeviceState, string> = {
  online: 'text-green-700 dark:text-green-400',
  stale: 'text-amber-700 dark:text-amber-400',
  offline: 'text-red-700 dark:text-red-400',
}

/** Indikator status perangkat (online/stale/offline) dengan meta terbaru:
 * RSSI, versi firmware, dan peringatan lompat seq (siklus terlewat). */
export function DeviceStatus({
  state,
  latest,
  seqGap,
}: {
  state: DeviceState
  latest?: Telemetry | null
  seqGap?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${VARIANT[state]}`}>
          {LABEL[state].status}
        </span>
        <span className={`text-sm font-medium ${VARIANT[state]}`}>{LABEL[state].keterangan}</span>
      </div>
      {latest && (
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {latest.rssi != null && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" aria-hidden="true" />
              RSSI {latest.rssi} dBm
            </span>
          )}
          {latest.fw && <span>FW {latest.fw}</span>}
        </div>
      )}
      {seqGap && (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          Seq melompati siklus
        </span>
      )}
    </div>
  )
}
