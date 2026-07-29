import {
  COLOR_THEME_STORAGE_KEY,
  DARK_THEME_MEDIA_QUERY,
  resolveColorTheme,
  type ColorTheme
} from '~/utils/colorTheme'

export function useSearchDialog() {
  const isOpen = useState('wiki-search-open', () => false)

  return {
    isOpen,
    open: () => {
      isOpen.value = true
    },
    close: () => {
      isOpen.value = false
    }
  }
}

export function useColorTheme() {
  function apply(value: ColorTheme): void {
    document.documentElement.dataset.theme = value
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, value)
    } catch {
      // The selected theme still applies for this page when storage is blocked.
    }
  }

  return {
    toggle: () => {
      if (!import.meta.client) {
        return
      }

      const current = resolveColorTheme(
        document.documentElement.dataset.theme,
        window.matchMedia(DARK_THEME_MEDIA_QUERY).matches
      )
      apply(current === 'light' ? 'dark' : 'light')
    }
  }
}
