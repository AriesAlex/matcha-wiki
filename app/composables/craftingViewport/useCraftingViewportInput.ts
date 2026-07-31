import { useEventListener } from '@vueuse/core'
import type { ShallowRef } from 'vue'
import type {
  CraftingViewportControls,
  UseCraftingViewportOptions
} from './types'
import type { CraftingViewportTransform } from '../../utils/craftingViewport'
import { clampCraftingViewportScale } from '../../utils/craftingViewport'

interface CraftingViewportInputOptions {
  rootRef: ShallowRef<HTMLElement | null>
  transform: Readonly<ShallowRef<CraftingViewportTransform>>
  options: UseCraftingViewportOptions
  fit: CraftingViewportControls['fit']
  panBy: CraftingViewportControls['panBy']
  zoomTo: CraftingViewportControls['zoomTo']
  zoomIn: CraftingViewportControls['zoomIn']
  zoomOut: CraftingViewportControls['zoomOut']
}

export function useCraftingViewportInput({
  rootRef,
  transform,
  options,
  fit,
  panBy,
  zoomTo,
  zoomIn,
  zoomOut
}: CraftingViewportInputOptions): void {
  useEventListener(rootRef, 'wheel', onWheel, { passive: false })
  useEventListener(rootRef, 'keydown', onKeyDown)

  function onWheel(event: WheelEvent): void {
    const root = rootRef.value
    if (
      !root
      || (
        event.target instanceof Element
        && event.target.closest('[data-crafting-wheel-pass-through]')
      )
    ) return

    const delta = normalizedWheelDelta(event)
    if (!Number.isFinite(delta) || delta === 0) return

    const factor = Math.exp(-delta * (options.wheelZoomSpeed ?? 0.0015))
    const nextScale = clampCraftingViewportScale(
      transform.value.scale * factor,
      {
        minScale: options.minScale,
        maxScale: options.maxScale
      }
    )
    event.preventDefault()
    if (nextScale === transform.value.scale) return

    const rect = root.getBoundingClientRect()
    zoomTo(
      nextScale,
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      },
      { animate: false }
    )
  }

  function onKeyDown(event: KeyboardEvent): void {
    const root = rootRef.value
    if (
      !root
      || event.target !== root
      || event.altKey
      || event.ctrlKey
      || event.metaKey
    ) {
      return
    }

    const step = (options.keyboardPanStep ?? 48) * (event.shiftKey ? 2 : 1)
    let handled = true

    switch (event.key) {
      case '+':
      case '=':
      case 'Add':
        zoomIn()
        break
      case '-':
      case '_':
      case 'Subtract':
        zoomOut()
        break
      case '0':
        zoomTo(1)
        break
      case 'Home':
      case 'f':
      case 'F':
        fit()
        break
      case 'ArrowLeft':
        panBy(step, 0)
        break
      case 'ArrowRight':
        panBy(-step, 0)
        break
      case 'ArrowUp':
        panBy(0, step)
        break
      case 'ArrowDown':
        panBy(0, -step)
        break
      default:
        handled = false
    }

    if (handled) event.preventDefault()
  }
}

function normalizedWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * (event.currentTarget as HTMLElement).clientHeight
  }
  return event.deltaY
}
