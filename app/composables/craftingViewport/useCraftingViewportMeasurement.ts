import { useResizeObserver } from '@vueuse/core'
import {
  onBeforeUnmount,
  onMounted,
  toValue,
  watch
} from 'vue'
import type { ShallowRef } from 'vue'
import type { UseCraftingViewportOptions } from './types'
import type {
  CraftingViewportBounds,
  CraftingViewportSize
} from '../../utils/craftingViewport'

interface CraftingViewportMeasurementOptions {
  rootRef: ShallowRef<HTMLElement | null>
  contentRef: ShallowRef<HTMLElement | null>
  viewportSize: ShallowRef<CraftingViewportSize>
  contentBounds: ShallowRef<CraftingViewportBounds | null>
  hasInteracted: Readonly<ShallowRef<boolean>>
  options: UseCraftingViewportOptions
  constrainCurrentTransform: () => void
  autoFit: () => void
}

export function useCraftingViewportMeasurement({
  rootRef,
  contentRef,
  viewportSize,
  contentBounds,
  hasInteracted,
  options,
  constrainCurrentTransform,
  autoFit
}: CraftingViewportMeasurementOptions) {
  let measurementFrame: number | undefined

  useResizeObserver(rootRef, scheduleMeasurement)
  useResizeObserver(contentRef, scheduleMeasurement)
  watch(
    () => toValue(options.bounds),
    scheduleMeasurement,
    { deep: true, flush: 'post' }
  )
  onMounted(scheduleMeasurement)
  onBeforeUnmount(cancelMeasurement)

  function measure(): boolean {
    const root = rootRef.value
    if (!root) return false

    const width = root.clientWidth
    const height = root.clientHeight
    if (width <= 0 || height <= 0) return false

    const bounds = toValue(options.bounds) ?? measureContent(contentRef.value)
    if (!bounds) return false

    viewportSize.value = { width, height }
    contentBounds.value = bounds
    constrainCurrentTransform()
    return true
  }

  function scheduleMeasurement(): void {
    if (typeof window === 'undefined') return
    if (measurementFrame !== undefined) {
      window.cancelAnimationFrame(measurementFrame)
    }

    measurementFrame = window.requestAnimationFrame(() => {
      measurementFrame = undefined
      const measured = measure()
      if (measured && options.autoFit !== false && !hasInteracted.value) {
        autoFit()
      }
    })
  }

  function cancelMeasurement(): void {
    if (measurementFrame === undefined || typeof window === 'undefined') return

    window.cancelAnimationFrame(measurementFrame)
    measurementFrame = undefined
  }

  return { measure }
}

function measureContent(
  content: HTMLElement | null
): CraftingViewportBounds | null {
  if (!content) return null

  const width = Math.max(content.scrollWidth, content.offsetWidth)
  const height = Math.max(content.scrollHeight, content.offsetHeight)
  if (width <= 0 || height <= 0) return null

  return {
    x: content.offsetLeft,
    y: content.offsetTop,
    width,
    height
  }
}
