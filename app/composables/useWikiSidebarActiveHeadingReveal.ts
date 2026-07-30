import { usePreferredReducedMotion } from '@vueuse/core'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import { computed, nextTick, toValue, watch } from 'vue'
import { scrollTopToReveal } from '~/utils/articleNavigation'

export function useWikiSidebarActiveHeadingReveal(
  sidebar: Readonly<ShallowRef<HTMLElement | null>>,
  open: MaybeRefOrGetter<boolean>
) {
  const route = useRoute()
  const currentPath = computed(() => normalizeWikiPath(route.path))
  const preferredMotion = usePreferredReducedMotion()
  const { activeHeading } = useActiveArticleHeading()
  const activeHeadingId = computed(() => (
    activeHeading.value.path === currentPath.value
      ? activeHeading.value.id
      : null
  ))

  watch(
    [
      activeHeadingId,
      () => toValue(open),
      currentPath
    ],
    async ([activeId]) => {
      if (!activeId) {
        return
      }

      await nextTick()
      revealActiveHeading()
    },
    { flush: 'post' }
  )

  function revealActiveHeading(): void {
    const container = sidebar.value
    const target = container?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!container || !target || target.getClientRects().length === 0) {
      return
    }

    const nextScrollTop = scrollTopToReveal(
      container.getBoundingClientRect(),
      target.getBoundingClientRect(),
      container.scrollTop,
      14
    )
    if (Math.abs(nextScrollTop - container.scrollTop) < 1) {
      return
    }

    container.scrollTo({
      top: nextScrollTop,
      behavior: preferredMotion.value === 'reduce' ? 'auto' : 'smooth'
    })
  }

  return {
    activeHeadingId
  }
}
