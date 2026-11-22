import type { Telemetry } from './parseTelemetry'

/**
 * Domain numerik untuk XAxis grafik riwayat. Recharts memakai domain default
 * `[0, 'auto']`, sehingga timestamp epoch (~1,79 miliar) membuat semua titik
 * menumpuk di ujung kanan dan garis terlihat kosong.
 */
export function timeDomain(data: Telemetry[]): [number, number] {
  if (data.length === 0) return [0, 0]
  let min = Infinity
  let max = -Infinity
  for (const p of data) {
    if (p.ts < min) min = p.ts
    if (p.ts > max) max = p.ts
  }
  // Satu titik perlu jendela kecil supaya dot-nya tetap terlihat.
  if (min === max) return [min - 1, max + 1]
  return [min, max]
}
