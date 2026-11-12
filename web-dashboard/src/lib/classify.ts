import thresholds from './thresholds.json'

export type Status = 'DRINKABLE' | 'HYGIENE_OK' | 'UNFIT'

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
    turbidity_ntu: { drinkable: Range; hygiene_ok: Range }
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

function parameterStatus(value: number, drinkableMax: number, hygieneMax: number): Status {
  if (value < drinkableMax) {
    return 'DRINKABLE'
  }
  if (value < hygieneMax) {
    return 'HYGIENE_OK'
  }
  return 'UNFIT'
}

/**
 * Classify water quality. Boundary semantics from shared/thresholds.json:
 * lower bound inclusive, upper bound exclusive, except pH where both bounds
 * are inclusive. Worst parameter wins.
 */
export function classify(ph: number, tds_ppm: number, turbidity_ntu: number): Status {
  const phStatus = inRange(ph, t.parameters.ph.drinkable) ? 'DRINKABLE' : 'UNFIT'
  const tdsStatus = parameterStatus(
    tds_ppm,
    t.parameters.tds_ppm.drinkable.max,
    t.parameters.tds_ppm.hygiene_ok.max,
  )
  const turbStatus = parameterStatus(
    turbidity_ntu,
    t.parameters.turbidity_ntu.drinkable.max,
    t.parameters.turbidity_ntu.hygiene_ok.max,
  )

  return worse(worse(phStatus, tdsStatus), turbStatus)
}
