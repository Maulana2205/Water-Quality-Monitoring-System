export type DeviceState = 'online' | 'stale' | 'offline'

// Staleness boundaries (seconds since last ts):
// online  : age < 45 min
// stale   : 45 min <= age <= 90 min
// offline : age > 90 min
// Deep sleep means "disconnected" != "offline"; state derives only from ts age.
const ONLINE_MAX_SEC = 45 * 60   // 2700
const STALE_MAX_SEC = 90 * 60    // 5400

export function deviceState(lastTsSeconds: number, nowSeconds: number = now()): DeviceState {
  const age = nowSeconds - lastTsSeconds
  if (age < 0) {
    return 'online' // future timestamp (clock skew) -> treat as online
  }
  if (age < ONLINE_MAX_SEC) {
    return 'online'
  }
  if (age <= STALE_MAX_SEC) {
    return 'stale'
  }
  return 'offline'
}

function now(): number {
  return Math.floor(Date.now() / 1000)
}
