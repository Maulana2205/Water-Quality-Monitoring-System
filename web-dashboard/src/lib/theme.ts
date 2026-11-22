export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'water-quality-theme'

/** Preferensi tersimpan menang; kalau belum ada, ikuti sistem. */
export function resolveInitialTheme(stored: string | null, systemDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return systemDark ? 'dark' : 'light'
}
