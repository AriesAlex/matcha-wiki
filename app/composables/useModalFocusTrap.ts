import { useEventListener } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

export function useModalFocusTrap(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  open: MaybeRefOrGetter<boolean>,
  initialFocus: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options: { inertOutside?: boolean } = {}
): void {
  let restoreFocusTo: HTMLElement | null = null
  let restoreOutside = () => {}

  watch(
    () => toValue(open),
    async (isOpen) => {
      if (isOpen) {
        restoreFocusTo = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
        await nextTick()
        if (!toValue(open)) return
        restoreOutside()
        restoreOutside = options.inertOutside
          ? makeOutsideInert(toValue(container))
          : () => {}
        const focusTarget = toValue(initialFocus) ?? toValue(container)
        focusTarget?.focus()
        return
      }

      restoreOutside()
      restoreOutside = () => {}
      await nextTick()
      restoreFocus()
    },
    { flush: 'post' }
  )

  useEventListener(
    () => toValue(container) ?? null,
    'keydown',
    (event: KeyboardEvent) => {
      if (!toValue(open) || event.key !== 'Tab') return

      const dialog = toValue(container)
      if (!dialog) return
      event.stopPropagation()

      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter(element => !element.hidden && element.getClientRects().length > 0)
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      const current = document.activeElement
      if (
        event.shiftKey
        && first
        && (current === first || !dialog.contains(current))
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey
        && last
        && (current === last || !dialog.contains(current))
      ) {
        event.preventDefault()
        first?.focus()
      }
    }
  )

  onBeforeUnmount(() => {
    restoreOutside()
    restoreFocus()
  })

  function restoreFocus(): void {
    if (!restoreFocusTo?.isConnected) {
      restoreFocusTo = null
      return
    }

    restoreFocusTo.focus()
    restoreFocusTo = null
  }
}

function makeOutsideInert(
  container: HTMLElement | null | undefined
): () => void {
  if (!container?.isConnected) return () => {}

  const previous = new Map<HTMLElement, boolean>()
  let branch = container

  while (branch.parentElement) {
    const parent = branch.parentElement
    for (const sibling of parent.children) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue
      previous.set(sibling, sibling.inert)
      sibling.inert = true
    }
    if (parent === document.body) break
    branch = parent
  }

  return () => {
    for (const [element, inert] of previous) {
      element.inert = inert
    }
  }
}
