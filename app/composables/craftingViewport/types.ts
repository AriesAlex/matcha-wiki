import type { usePreferredReducedMotion } from '@vueuse/core'
import type {
  ComputedRef,
  CSSProperties,
  MaybeRefOrGetter,
  ShallowRef
} from 'vue'
import type {
  CraftingViewportBounds,
  CraftingViewportPoint,
  CraftingViewportScaleRange,
  CraftingViewportSize,
  CraftingViewportTransform
} from '../../utils/craftingViewport'

export interface CraftingViewportActionOptions {
  animate?: boolean
}

export interface SetCraftingViewportOptions
  extends CraftingViewportActionOptions {
  markInteracted?: boolean
}

export interface FocusCraftingViewportOptions
  extends SetCraftingViewportOptions {
  scale?: number
  verticalAnchor?: number
}

export interface UseCraftingViewportOptions
  extends Partial<CraftingViewportScaleRange> {
  activated?: MaybeRefOrGetter<boolean>
  fullscreen?: MaybeRefOrGetter<boolean>
  bounds?: MaybeRefOrGetter<CraftingViewportBounds | null | undefined>
  autoFit?: boolean
  fitPadding?: number
  initialTransform?: Partial<CraftingViewportTransform>
  animationDuration?: number
  keyboardPanStep?: number
  panVisibilityMargin?: number
  zoomStep?: number
  wheelZoomSpeed?: number
}

export interface CraftingViewportControls {
  rootRef: ShallowRef<HTMLElement | null>
  contentRef: ShallowRef<HTMLElement | null>
  transform: Readonly<ShallowRef<CraftingViewportTransform>>
  viewportSize: Readonly<ShallowRef<CraftingViewportSize>>
  contentBounds: Readonly<ShallowRef<CraftingViewportBounds | null>>
  hasInteracted: Readonly<ShallowRef<boolean>>
  isInteracting: Readonly<ShallowRef<boolean>>
  prefersReducedMotion: ReturnType<typeof usePreferredReducedMotion>
  gestureMode: ComputedRef<boolean>
  rootStyle: ComputedRef<CSSProperties>
  transformStyle: ComputedRef<CSSProperties>
  measure: () => boolean
  fit: (options?: CraftingViewportActionOptions) => boolean
  focusBounds: (
    bounds: CraftingViewportBounds,
    options?: FocusCraftingViewportOptions
  ) => boolean
  reset: (options?: CraftingViewportActionOptions) => void
  setTransform: (
    transform: CraftingViewportTransform,
    options?: SetCraftingViewportOptions
  ) => void
  panBy: (
    x: number,
    y: number,
    options?: SetCraftingViewportOptions
  ) => void
  zoomTo: (
    scale: number,
    point?: CraftingViewportPoint,
    options?: SetCraftingViewportOptions
  ) => void
  zoomIn: (options?: CraftingViewportActionOptions) => void
  zoomOut: (options?: CraftingViewportActionOptions) => void
}
