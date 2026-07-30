import { useEventListener } from '@vueuse/core'
import {
  onBeforeUnmount,
  watch
} from 'vue'
import type {
  ComputedRef,
  ShallowRef
} from 'vue'
import type { CraftingViewportControls } from './types'
import type { CraftingViewportPoint } from '../../utils/craftingViewport'

interface ActivePointer extends CraftingViewportPoint {
  type: string
}

interface CraftingViewportPointerGestureOptions {
  rootRef: ShallowRef<HTMLElement | null>
  gestureMode: ComputedRef<boolean>
  isInteracting: ShallowRef<boolean>
  panBy: CraftingViewportControls['panBy']
  pinch: (
    beforeCenter: CraftingViewportPoint,
    afterCenter: CraftingViewportPoint,
    scaleFactor: number
  ) => void
  stopAnimation: () => void
}

const backgroundSelector = '[data-crafting-viewport-background]'

export function useCraftingViewportPointerGestures({
  rootRef,
  gestureMode,
  isInteracting,
  panBy,
  pinch,
  stopAnimation
}: CraftingViewportPointerGestureOptions): void {
  const activePointers = new Map<number, ActivePointer>()

  useEventListener(rootRef, 'pointerdown', onPointerDown, { passive: false })
  useEventListener(rootRef, 'pointermove', onPointerMove, { passive: false })
  useEventListener(rootRef, ['pointerup', 'pointercancel'], onPointerEnd)
  useEventListener(
    () => typeof window === 'undefined' ? null : window,
    'blur',
    clearPointers
  )
  watch(gestureMode, (enabled) => {
    if (!enabled) clearTouchPointers()
  })
  onBeforeUnmount(clearPointers)

  function onPointerDown(event: PointerEvent): void {
    const root = rootRef.value
    if (
      !root
      || (event.pointerType === 'mouse' && event.button !== 0)
      || (event.pointerType !== 'mouse' && !gestureMode.value)
      || (!activePointers.size && !isViewportBackground(event.target, root))
    ) {
      return
    }

    activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      type: event.pointerType
    })
    isInteracting.value = true
    stopAnimation()
    root.setPointerCapture(event.pointerId)
    if (event.cancelable) event.preventDefault()
  }

  function onPointerMove(event: PointerEvent): void {
    const previous = activePointers.get(event.pointerId)
    if (!previous) return

    const before = firstTwoPointers()
    activePointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      type: event.pointerType
    })
    const after = firstTwoPointers()

    if (before.length === 2 && after.length === 2 && gestureMode.value) {
      const [beforeFirst, beforeSecond] = before
      const [afterFirst, afterSecond] = after
      if (!beforeFirst || !beforeSecond || !afterFirst || !afterSecond) return

      const beforeDistance = distance(beforeFirst, beforeSecond)
      const afterDistance = distance(afterFirst, afterSecond)
      if (beforeDistance > 0 && afterDistance > 0) {
        pinch(
          midpoint(beforeFirst, beforeSecond),
          midpoint(afterFirst, afterSecond),
          afterDistance / beforeDistance
        )
      }
    } else {
      panBy(event.clientX - previous.x, event.clientY - previous.y)
    }

    if (event.cancelable) event.preventDefault()
  }

  function onPointerEnd(event: PointerEvent): void {
    const root = rootRef.value
    if (!activePointers.delete(event.pointerId)) return

    if (root?.hasPointerCapture(event.pointerId)) {
      root.releasePointerCapture(event.pointerId)
    }
    isInteracting.value = activePointers.size > 0
  }

  function clearTouchPointers(): void {
    for (const [pointerId, pointer] of activePointers) {
      if (pointer.type !== 'mouse') releasePointer(pointerId)
    }
    isInteracting.value = activePointers.size > 0
  }

  function clearPointers(): void {
    for (const pointerId of activePointers.keys()) {
      releasePointer(pointerId)
    }
    activePointers.clear()
    isInteracting.value = false
  }

  function releasePointer(pointerId: number): void {
    const root = rootRef.value
    activePointers.delete(pointerId)
    if (root?.hasPointerCapture(pointerId)) {
      root.releasePointerCapture(pointerId)
    }
  }

  function firstTwoPointers(): ActivePointer[] {
    return [...activePointers.values()].slice(0, 2)
  }
}

function isViewportBackground(
  target: EventTarget | null,
  root: HTMLElement
): boolean {
  return target === root
    || (
      target instanceof Element
      && target.matches(backgroundSelector)
    )
}

function midpoint(
  first: CraftingViewportPoint,
  second: CraftingViewportPoint
): CraftingViewportPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2
  }
}

function distance(
  first: CraftingViewportPoint,
  second: CraftingViewportPoint
): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}
