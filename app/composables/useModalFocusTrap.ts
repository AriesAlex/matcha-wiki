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
  initialFocus: MaybeRefOrGetter<HTMLElement | null | undefined>
): void {
  let restoreFocusTo: HTMLElement | null = null

  watch(
    () => toValue(open),
    async (isOpen) => {
      if (isOpen) {
        restoreFocusTo = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
        await nextTick()
        toValue(initialFocus)?.focus()
        return
      }

      await nextTick()
      restoreFocus()
    },
    { flush: 'post' }
  )

  useEventListener(
    () => import.meta.client ? document : null,
    'keydown',
    (event: KeyboardEvent) => {
      if (!toValue(open) || event.key !== 'Tab') return

      const dialog = toValue(container)
      if (!dialog) return

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

  onBeforeUnmount(restoreFocus)

  function restoreFocus(): void {
    if (!restoreFocusTo?.isConnected) {
      restoreFocusTo = null
      return
    }

    restoreFocusTo.focus()
    restoreFocusTo = null
  }
}
