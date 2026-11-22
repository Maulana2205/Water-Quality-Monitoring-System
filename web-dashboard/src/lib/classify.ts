import thresholds from './thresholds.json'

export type Status = 'DRINKABLE' | 'HYGIENE_OK' | 'UNFIT'
export type SensorKey = 'temperature' | 'ph' | 'tds_ppm'

interface Range {
  min: number
  max: number
  min_inclusive: boolean
  max_inclusive: boolean
}

interface ThresholdsDoc {
  parameters: {
    ph: { drinkable: Range; hygiene_ok: Range }
    tds_ppm: { drinkable: Range; hygiene_ok: Range }
  }
}

const t = thresholds as ThresholdsDoc

function rank(s: Status): number {
  switch (s) {
    case 'DRINKABLE':
      return 0
    case 'HYGIENE_OK':
      return 1
    case 'UNFIT':
      return 2
  }
}

function worse(a: Status, b: Status): Status {
  return rank(a) >= rank(b) ? a : b
}

function inRange(value: number, r: Range): boolean {
  const lo = r.min_inclusive ? value >= r.min : value > r.min
  const hi = r.max_inclusive ? value <= r.max : value < r.max
  return lo && hi
}

/**
 * Status untuk SATU parameter. Suhu tidak diklasifikasi (opsi C): suhu hanya
 * dipakai untuk kompensasi TDS di firmware. null bila tidak ada ambang.
 */
export function classifyParameter(value: number, key: SensorKey): Status | null {
  if (key === 'temperature') return null
  if (key === 'ph') {
    return inRange(value, t.parameters.ph.drinkable) ? 'DRINKABLE' : 'UNFIT'
  }
  return value < t.parameters.tds_ppm.drinkable.max ? 'DRINKABLE' : 'UNFIT'
}

/** Nilai garis ambang untuk grafik, langsung dari thresholds.json. */
export const thresholdLines: Record<'ph' | 'tds_ppm', number[]> = {
  ph: [t.parameters.ph.drinkable.min, t.parameters.ph.drinkable.max],
  tds_ppm: [t.parameters.tds_ppm.drinkable.max],
}

/**
 * Klasifikasi gabungan. Permenkes 2/2023 memberi batas fisik-kimia identik
 * untuk air minum dan higiene, jadi HYGIENE_OK tidak pernah dihasilkan.
 */
export function classify(ph: number, tds_ppm: number): Status {
  return worse(
    classifyParameter(ph, 'ph') ?? 'UNFIT',
    classifyParameter(tds_ppm, 'tds_ppm') ?? 'UNFIT',
  )
}
