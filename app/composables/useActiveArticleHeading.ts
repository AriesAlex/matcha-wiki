interface ActiveArticleHeading {
  path: string
  id: string | null
}

export function useActiveArticleHeading() {
  const activeHeading = useState<ActiveArticleHeading>(
    'wiki:active-article-heading',
    () => ({
      path: '',
      id: null
    })
  )

  function setActiveHeading(path: string, id: string | null): void {
    const normalizedPath = normalizeWikiPath(path)
    if (
      activeHeading.value.path === normalizedPath
      && activeHeading.value.id === id
    ) {
      return
    }

    activeHeading.value = {
      path: normalizedPath,
      id
    }
  }

  return {
    activeHeading: readonly(activeHeading),
    setActiveHeading
  }
}
