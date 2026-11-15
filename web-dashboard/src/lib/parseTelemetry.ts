import { z, type ZodError } from 'zod'

export type TelemetryStatus = 'DRINKABLE' | 'HYGIENE_OK' | 'UNFIT'

export interface Telemetry {
  device_id: string
  ts: number
  seq: number
  temperature: number
  ph: number
  tds_ppm: number
  status: TelemetryStatus
  active_time_ms?: number
  rssi?: number
  fw?: string
  battery_mv?: number
}

export class ParseTelemetryError extends Error {
  public readonly issues: ZodError
  constructor(issues: ZodError) {
    super(`Invalid telemetry: ${issues.issues.map((i) => i.message).join('; ')}`)
    this.name = 'ParseTelemetryError'
    this.issues = issues
  }
}

const telemetrySchema = z
  .object({
    device_id: z.string().min(1),
    ts: z.number().int(),
    seq: z.number().int(),
    temperature: z.number().finite(),
    ph: z.number().finite(),
    tds_ppm: z.number().finite(),
    status: z.enum(['DRINKABLE', 'HYGIENE_OK', 'UNFIT']),
    active_time_ms: z.number().int().optional(),
    rssi: z.number().int().optional(),
    fw: z.string().optional(),
    battery_mv: z.number().int().optional(),
  })
  .strict()

export type ParseTelemetryResult =
  | { ok: true; value: Telemetry }
  | { ok: false; error: ParseTelemetryError }

export function parseTelemetry(input: unknown): ParseTelemetryResult {
  const parsed = telemetrySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: new ParseTelemetryError(parsed.error) }
  }
  return { ok: true, value: parsed.data }
}
