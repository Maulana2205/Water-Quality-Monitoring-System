import { thresholdLines, type SensorKey } from './classify'

export interface RefLine {
  y: number
  label: string
  color: string
}

/** Garis ambang khusus untuk grafik satu sensor (sumber: thresholds.json). */
export function referenceLinesFor(key: SensorKey): RefLine[] {
  if (key === 'ph') {
    return thresholdLines.ph.map((y) => ({ y, label: `pH ${y}`, color: '#f59e0b' }))
  }
  if (key === 'tds_ppm') {
    return thresholdLines.tds_ppm.map((y) => ({ y, label: `TDS ${y}`, color: '#ef4444' }))
  }
  // Suhu tidak diklasifikasikan (opsi C) -> tanpa garis ambang.
  return []
}
