import { useEventListener } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'

export function useSearchKeyboardNavigation<T>(
  open: MaybeRefOrGetter<boolean>,
  results: MaybeRefOrGetter<T[]>,
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  select: (entry: T) => void
) {
  const activeIndex = ref(0)

  watch(
    [
      () => toValue(open),
      () => toValue(results)
    ],
    ([isOpen, entries]) => {
      activeIndex.value = isOpen && entries.length ? 0 : -1
    },
    { immediate: true }
  )

  useEventListener(
    () => import.meta.client ? document : null,
    'keydown',
    (event: KeyboardEvent) => {
      if (!toValue(open) || event.target !== toValue(target)) return

      const entries = toValue(results)
      if (!entries.length) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        activeIndex.value = (activeIndex.value + 1) % entries.length
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        activeIndex.value = (activeIndex.value - 1 + entries.length) % entries.length
      } else if (event.key === 'Home') {
        event.preventDefault()
        activeIndex.value = 0
      } else if (event.key === 'End') {
        event.preventDefault()
        activeIndex.value = entries.length - 1
      } else if (event.key === 'Enter' && activeIndex.value >= 0) {
        event.preventDefault()
        const entry = entries[activeIndex.value]
        if (entry !== undefined) select(entry)
      }
    }
  )

  function setActiveIndex(index: number): void {
    activeIndex.value = index
  }

  return {
    activeIndex: readonly(activeIndex),
    setActiveIndex
  }
}
