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

/** Indikator status perangkat (online/stale/offline) dengan label Bahasa Indonesia. */
export function DeviceStatus({ state }: { state: DeviceState }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${VARIANT[state]}`}>
        {LABEL[state].status}
      </span>
      <span className={`text-sm font-medium ${VARIANT[state]}`}>{LABEL[state].keterangan}</span>
    </div>
  )
}
