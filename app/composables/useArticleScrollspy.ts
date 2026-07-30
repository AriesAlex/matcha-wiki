import {
  useEventListener,
  useIntersectionObserver
} from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import {
  ARTICLE_HEADING_OFFSET,
  decodeHeadingHash,
  flattenWikiTocLinks,
  pickActiveHeading
} from '~/utils/articleNavigation'
import type { WikiTocLink } from '~/types/wiki'

export function useArticleScrollspy(
  article: MaybeRefOrGetter<HTMLElement | null | undefined>,
  links: MaybeRefOrGetter<WikiTocLink[]>,
  path: MaybeRefOrGetter<string>
): void {
  const headingElements = shallowRef<HTMLElement[]>([])
  const headingIds = computed(() => (
    flattenWikiTocLinks(toValue(links)).map(link => link.id)
  ))
  const normalizedPath = computed(() => normalizeWikiPath(toValue(path)))
  const { setActiveHeading } = useActiveArticleHeading()

  let animationFrame: number | undefined
  let bindVersion = 0
  let hasMeasuredHeading = false
  let mounted = false

  useIntersectionObserver(
    headingElements,
    () => scheduleMeasure(),
    {
      rootMargin: `-${ARTICLE_HEADING_OFFSET}px 0px -65% 0px`,
      threshold: [0, 1]
    }
  )

  watch(
    [
      () => toValue(article),
      normalizedPath,
      () => toValue(links)
    ],
    () => resetHeadings(),
    {
      flush: 'post',
      immediate: true
    }
  )

  onMounted(() => {
    mounted = true
    useEventListener(window, 'scroll', scheduleMeasure, { passive: true })
    useEventListener(window, 'resize', scheduleMeasure, { passive: true })
    resetHeadings()
  })

  onBeforeUnmount(() => {
    mounted = false
    bindVersion += 1
    cancelMeasure()
    headingElements.value = []
  })

  function resetHeadings(): void {
    bindVersion += 1
    cancelMeasure()
    headingElements.value = []
    hasMeasuredHeading = false
    setActiveHeading(normalizedPath.value, null)

    if (mounted) {
      void bindHeadings(bindVersion)
    }
  }

  async function bindHeadings(version: number): Promise<void> {
    await nextTick()
    if (!mounted || version !== bindVersion) {
      return
    }

    const articleElement = toValue(article)
    if (!articleElement) {
      return
    }

    headingElements.value = headingIds.value.flatMap((id) => {
      const element = document.getElementById(id)
      return element instanceof HTMLElement && articleElement.contains(element)
        ? [element]
        : []
    })

    const initialId = decodeHeadingHash(window.location.hash)
    if (initialId && headingIds.value.includes(initialId)) {
      setActiveHeading(normalizedPath.value, initialId)
    }

    scheduleMeasure()
  }

  function scheduleMeasure(): void {
    if (!mounted || animationFrame !== undefined) {
      return
    }

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = undefined
      measureHeadings()
    })
  }

  function cancelMeasure(): void {
    if (animationFrame === undefined || !import.meta.client) {
      return
    }

    window.cancelAnimationFrame(animationFrame)
    animationFrame = undefined
  }

  function measureHeadings(): void {
    const activeId = pickActiveHeading(
      headingElements.value.map(element => ({
        id: element.id,
        top: element.getBoundingClientRect().top
      }))
    )

    if (activeId) {
      hasMeasuredHeading = true
    }

    setActiveHeading(normalizedPath.value, activeId)
    if (activeId || hasMeasuredHeading) {
      replaceLocationHash(activeId)
    }
  }

  function replaceLocationHash(id: string | null): void {
    const url = new URL(window.location.href)
    if (decodeHeadingHash(url.hash) === id) {
      return
    }

    url.hash = id ?? ''
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    )
  }
}
