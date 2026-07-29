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
  const theme = useState<'light' | 'dark'>('wiki-color-theme', () => 'light')

  function apply(value: 'light' | 'dark'): void {
    theme.value = value
    if (import.meta.client) {
      document.documentElement.dataset.theme = value
      localStorage.setItem('matcha-theme', value)
    }
  }

  onMounted(() => {
    const saved = localStorage.getItem('matcha-theme')
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    apply(saved === 'dark' || saved === 'light' ? saved : preferred)
  })

  return {
    theme,
    toggle: () => apply(theme.value === 'light' ? 'dark' : 'light')
  }
}
