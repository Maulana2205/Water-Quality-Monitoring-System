import { z } from 'zod'

/** Alert reason codes produced by the firmware (UNFIT kept for legacy payloads). */
export const ALERT_REASONS = ['PH_OUT_OF_RANGE', 'TDS_GT_MAX', 'UNFIT'] as const

const alertSchema = z
  .object({
    reasons: z.array(z.enum(ALERT_REASONS)),
  })
  .strict()

/** Returns validated reasons, or null when the payload must be dropped. */
export function parseAlert(input: unknown): string[] | null {
  const parsed = alertSchema.safeParse(input)
  return parsed.success ? [...parsed.data.reasons] : null
}
