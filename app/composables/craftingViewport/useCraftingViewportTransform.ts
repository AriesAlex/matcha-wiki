import { computed, shallowRef } from 'vue'
import type { usePreferredReducedMotion } from '@vueuse/core'
import type {
  CSSProperties,
  ShallowRef
} from 'vue'
import { useCraftingViewportAnimation } from './useCraftingViewportAnimation'
import type {
  CraftingViewportActionOptions,
  FocusCraftingViewportOptions,
  SetCraftingViewportOptions,
  UseCraftingViewportOptions
} from './types'
import {
  DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE,
  clampCraftingViewportPan,
  clampCraftingViewportScale,
  fitCraftingViewport,
  focusCraftingViewportBounds,
  zoomCraftingViewportAt
} from '../../utils/craftingViewport'
import type {
  CraftingViewportBounds,
  CraftingViewportPoint,
  CraftingViewportScaleRange,
  CraftingViewportSize,
  CraftingViewportTransform
} from '../../utils/craftingViewport'

interface CraftingViewportTransformOptions {
  rootRef: ShallowRef<HTMLElement | null>
  viewportSize: ShallowRef<CraftingViewportSize>
  contentBounds: ShallowRef<CraftingViewportBounds | null>
  isInteracting: Readonly<ShallowRef<boolean>>
  preferredMotion: ReturnType<typeof usePreferredReducedMotion>
  options: UseCraftingViewportOptions
}

export function useCraftingViewportTransform({
  rootRef,
  viewportSize,
  contentBounds,
  isInteracting,
  preferredMotion,
  options
}: CraftingViewportTransformOptions) {
  const scaleRange: CraftingViewportScaleRange = {
    minScale: options.minScale
      ?? DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE.minScale,
    maxScale: options.maxScale
      ?? DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE.maxScale
  }
  const initialTransform = normalizeTransform({
    x: options.initialTransform?.x ?? 0,
    y: options.initialTransform?.y ?? 0,
    scale: options.initialTransform?.scale ?? 1
  })
  const transform = shallowRef<CraftingViewportTransform>(initialTransform)
  const hasInteracted = shallowRef(false)
  const {
    isAnimating,
    animationDuration,
    startAnimation,
    stopAnimation
  } = useCraftingViewportAnimation(
    preferredMotion,
    () => options.animationDuration
  )
  const transformStyle = computed<CSSProperties>(() => {
    const current = transform.value
    return {
      transform: `translate3d(${cssNumber(current.x)}px, ${cssNumber(current.y)}px, 0) scale(${cssNumber(current.scale)})`,
      transformOrigin: '0 0',
      transition: isAnimating.value
        ? `transform ${animationDuration.value}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : 'none',
      willChange: isInteracting.value || isAnimating.value
        ? 'transform'
        : undefined
    }
  })

  function fitMeasured(animate: boolean, markInteracted: boolean): boolean {
    const bounds = contentBounds.value
    if (!bounds) return false

    applyTransform(
      fitCraftingViewport(
        viewportSize.value,
        bounds,
        {
          ...scaleRange,
          padding: options.fitPadding
        }
      ),
      { animate, markInteracted }
    )
    return true
  }

  function focusBounds(
    bounds: CraftingViewportBounds,
    {
      animate = true,
      markInteracted = false,
      scale = 1,
      verticalAnchor
    }: FocusCraftingViewportOptions = {}
  ): void {
    applyTransform(
      focusCraftingViewportBounds(
        viewportSize.value,
        bounds,
        { ...scaleRange, scale, verticalAnchor }
      ),
      { animate, markInteracted }
    )
  }

  function reset(
    actionOptions: CraftingViewportActionOptions = {}
  ): void {
    hasInteracted.value = false
    applyTransform(initialTransform, {
      animate: actionOptions.animate ?? true,
      markInteracted: false
    })
  }

  function setTransform(
    nextTransform: CraftingViewportTransform,
    actionOptions: SetCraftingViewportOptions = {}
  ): void {
    applyTransform(nextTransform, actionOptions)
  }

  function panBy(
    x: number,
    y: number,
    actionOptions: SetCraftingViewportOptions = {}
  ): void {
    applyTransform({
      ...transform.value,
      x: transform.value.x + finiteOr(x, 0),
      y: transform.value.y + finiteOr(y, 0)
    }, actionOptions)
  }

  function zoomTo(
    scale: number,
    point = viewportCenter(),
    actionOptions: SetCraftingViewportOptions = {}
  ): void {
    applyTransform(
      zoomCraftingViewportAt(
        transform.value,
        point,
        scale,
        scaleRange
      ),
      actionOptions
    )
  }

  function zoomIn(
    actionOptions: CraftingViewportActionOptions = {}
  ): void {
    zoomTo(
      transform.value.scale * (options.zoomStep ?? 1.18),
      viewportCenter(),
      { animate: actionOptions.animate ?? true }
    )
  }

  function zoomOut(
    actionOptions: CraftingViewportActionOptions = {}
  ): void {
    zoomTo(
      transform.value.scale / (options.zoomStep ?? 1.18),
      viewportCenter(),
      { animate: actionOptions.animate ?? true }
    )
  }

  function pinch(
    beforeCenter: CraftingViewportPoint,
    afterCenter: CraftingViewportPoint,
    scaleFactor: number
  ): void {
    const zoomed = zoomCraftingViewportAt(
      transform.value,
      beforeCenter,
      transform.value.scale * scaleFactor,
      scaleRange
    )
    applyTransform({
      x: zoomed.x + afterCenter.x - beforeCenter.x,
      y: zoomed.y + afterCenter.y - beforeCenter.y,
      scale: zoomed.scale
    })
  }

  function applyTransform(
    nextTransform: CraftingViewportTransform,
    {
      animate = false,
      markInteracted = true
    }: SetCraftingViewportOptions = {}
  ): void {
    if (markInteracted) hasInteracted.value = true

    const duration = animationDuration.value
    if (animate && duration > 0) {
      startAnimation(duration)
    } else {
      stopAnimation()
    }

    transform.value = constrainTransform(normalizeTransform(nextTransform))
  }

  function normalizeTransform(
    value: CraftingViewportTransform
  ): CraftingViewportTransform {
    return {
      x: finiteOr(value.x, 0),
      y: finiteOr(value.y, 0),
      scale: clampCraftingViewportScale(value.scale, scaleRange)
    }
  }

  function constrainTransform(
    value: CraftingViewportTransform
  ): CraftingViewportTransform {
    return contentBounds.value
      ? clampCraftingViewportPan(
          value,
          viewportSize.value,
          contentBounds.value,
          { visibleMargin: options.panVisibilityMargin }
        )
      : value
  }

  function constrainCurrentTransform(): void {
    transform.value = constrainTransform(transform.value)
  }

  function viewportCenter(): CraftingViewportPoint {
    const root = rootRef.value
    return {
      x: (root?.clientWidth ?? viewportSize.value.width) / 2,
      y: (root?.clientHeight ?? viewportSize.value.height) / 2
    }
  }

  return {
    transform,
    hasInteracted,
    transformStyle,
    fitMeasured,
    focusBounds,
    reset,
    setTransform,
    panBy,
    zoomTo,
    zoomIn,
    zoomOut,
    pinch,
    stopAnimation,
    constrainCurrentTransform
  }
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function cssNumber(value: number): number {
  return Number(value.toFixed(3))
}
