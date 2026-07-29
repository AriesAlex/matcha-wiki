export const COLOR_THEME_STORAGE_KEY = 'matcha-theme'
export const DARK_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export type ColorTheme = 'light' | 'dark'

export function resolveColorTheme(
  candidate: string | null | undefined,
  prefersDark: boolean
): ColorTheme {
  if (candidate === 'light' || candidate === 'dark') {
    return candidate
  }

  return prefersDark ? 'dark' : 'light'
}

export const COLOR_THEME_BOOTSTRAP_SCRIPT = `(()=>{let saved;try{saved=localStorage.getItem(${JSON.stringify(COLOR_THEME_STORAGE_KEY)})}catch{}document.documentElement.dataset.theme=saved==="light"||saved==="dark"?saved:matchMedia(${JSON.stringify(DARK_THEME_MEDIA_QUERY)}).matches?"dark":"light"})()`
