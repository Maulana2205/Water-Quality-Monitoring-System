import { parseTelemetry, type Telemetry } from './parseTelemetry'

const MAX_POINTS = 48
const STORAGE_KEY = 'water_quality_history'

type ValidResult = Extract<ReturnType<typeof parseTelemetry>, { ok: true }>

/**
 * Ring buffer of the last 48 telemetry points (~24 h at 30 min/cycle),
 * persisted in localStorage. Each stored entry is re-validated with zod on
 * hydrate, so corrupted or outdated storage never crashes the dashboard.
 */
export class History {
  private points: Telemetry[] = []

  constructor() {
    this.hydrate()
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return
      this.points = parsed
        .map((value) => parseTelemetry(value))
        .filter((result): result is ValidResult => result.ok)
        .map((result) => result.value)
        .slice(-MAX_POINTS)
    } catch {
      this.points = []
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.points))
    } catch {
      // storage full / disabled: keep in-memory only
    }
  }

  add(point: Telemetry): void {
    // Retained messages arrive again on every reload/reconnect: replace the
    // point with the same timestamp instead of storing a duplicate.
    const index = this.points.findIndex((p) => p.ts === point.ts)
    if (index >= 0) {
      this.points[index] = point
    } else {
      this.points.push(point)
      if (this.points.length > MAX_POINTS) {
        this.points = this.points.slice(-MAX_POINTS)
      }
    }
    this.persist()
  }

  getAll(): Telemetry[] {
    return [...this.points]
  }

  size(): number {
    return this.points.length
  }

  clear(): void {
    this.points = []
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
