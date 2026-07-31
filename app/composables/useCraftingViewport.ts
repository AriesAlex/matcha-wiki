import { usePreferredReducedMotion } from '@vueuse/core'
import {
  computed,
  readonly,
  shallowRef,
  toValue
} from 'vue'
import type { CSSProperties } from 'vue'
import { useCraftingViewportInput } from './craftingViewport/useCraftingViewportInput'
import { useCraftingViewportMeasurement } from './craftingViewport/useCraftingViewportMeasurement'
import { useCraftingViewportPointerGestures } from './craftingViewport/useCraftingViewportPointerGestures'
import { useCraftingViewportTransform } from './craftingViewport/useCraftingViewportTransform'
import type {
  CraftingViewportActionOptions,
  CraftingViewportControls,
  FocusCraftingViewportOptions,
  UseCraftingViewportOptions
} from './craftingViewport/types'
import type {
  CraftingViewportBounds,
  CraftingViewportSize
} from '../utils/craftingViewport'

export type {
  CraftingViewportControls,
  UseCraftingViewportOptions
} from './craftingViewport/types'

export function useCraftingViewport(
  options: UseCraftingViewportOptions = {}
): CraftingViewportControls {
  const rootRef = shallowRef<HTMLElement | null>(null)
  const contentRef = shallowRef<HTMLElement | null>(null)
  const viewportSize = shallowRef<CraftingViewportSize>({
    width: 0,
    height: 0
  })
  const contentBounds = shallowRef<CraftingViewportBounds | null>(null)
  const isInteracting = shallowRef(false)
  const preferredMotion = usePreferredReducedMotion()
  const gestureMode = computed(() => (
    Boolean(toValue(options.activated))
    || Boolean(toValue(options.fullscreen))
  ))
  const rootStyle = computed<CSSProperties>(() => ({
    touchAction: gestureMode.value ? 'none' : 'pan-y'
  }))

  const transformControls = useCraftingViewportTransform({
    rootRef,
    viewportSize,
    contentBounds,
    isInteracting,
    preferredMotion,
    options
  })

  function fit(
    actionOptions: CraftingViewportActionOptions = {}
  ): boolean {
    return fitInternal(actionOptions.animate ?? true, true)
  }

  function fitInternal(animate: boolean, markInteracted: boolean): boolean {
    if (!measurement.measure()) return false
    return transformControls.fitMeasured(animate, markInteracted)
  }

  function focusBounds(
    bounds: CraftingViewportBounds,
    actionOptions: FocusCraftingViewportOptions = {}
  ): boolean {
    if (!measurement.measure()) return false
    transformControls.focusBounds(bounds, actionOptions)
    return true
  }

  useCraftingViewportPointerGestures({
    rootRef,
    gestureMode,
    isInteracting,
    panBy: transformControls.panBy,
    pinch: transformControls.pinch,
    stopAnimation: transformControls.stopAnimation
  })
  useCraftingViewportInput({
    rootRef,
    transform: transformControls.transform,
    options,
    fit,
    panBy: transformControls.panBy,
    zoomTo: transformControls.zoomTo,
    zoomIn: transformControls.zoomIn,
    zoomOut: transformControls.zoomOut
  })

  const measurement = useCraftingViewportMeasurement({
    rootRef,
    contentRef,
    viewportSize,
    contentBounds,
    hasInteracted: transformControls.hasInteracted,
    options,
    constrainCurrentTransform: transformControls.constrainCurrentTransform,
    autoFit: () => fitInternal(false, false)
  })

  return {
    rootRef,
    contentRef,
    transform: readonly(transformControls.transform),
    viewportSize: readonly(viewportSize),
    contentBounds: readonly(contentBounds),
    hasInteracted: readonly(transformControls.hasInteracted),
    isInteracting: readonly(isInteracting),
    prefersReducedMotion: preferredMotion,
    gestureMode,
    rootStyle,
    transformStyle: transformControls.transformStyle,
    measure: measurement.measure,
    fit,
    focusBounds,
    reset: transformControls.reset,
    setTransform: transformControls.setTransform,
    panBy: transformControls.panBy,
    zoomTo: transformControls.zoomTo,
    zoomIn: transformControls.zoomIn,
    zoomOut: transformControls.zoomOut
  }
}
