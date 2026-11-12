import type { Telemetry } from './parseTelemetry'

const MAX_POINTS = 48
const STORAGE_KEY = 'water_quality_history'

/**
 * Ring buffer of the last 48 telemetry points (~24 h at 30 min/cycle),
 * persisted in localStorage. Corrupted storage is treated as empty
 * (never crashes the dashboard).
 */
export class History {
  private points: Telemetry[] = []

  constructor() {
    this.hydrate()
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.points = parsed as Telemetry[]
        }
      }
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
    this.points.push(point)
    if (this.points.length > MAX_POINTS) {
      this.points = this.points.slice(-MAX_POINTS)
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
