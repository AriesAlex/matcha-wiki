export interface CraftingViewportPoint {
  x: number
  y: number
}

export interface CraftingViewportSize {
  width: number
  height: number
}

export interface CraftingViewportBounds
  extends CraftingViewportPoint, CraftingViewportSize {}

export interface CraftingViewportTransform extends CraftingViewportPoint {
  scale: number
}

export interface CraftingViewportScaleRange {
  minScale: number
  maxScale: number
}

export interface FitCraftingViewportOptions
  extends Partial<CraftingViewportScaleRange> {
  padding?: number
}

export interface FocusCraftingViewportBoundsOptions
  extends Partial<CraftingViewportScaleRange> {
  /** Requested zoom level. The configured scale range is still respected. */
  scale?: number
  /** Vertical viewport position for the bounds centre: 0 is top, 1 is bottom. */
  verticalAnchor?: number
}

export interface ClampCraftingViewportPanOptions {
  visibleMargin?: number
}

export const DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE
  : Readonly<CraftingViewportScaleRange> = Object.freeze({
    minScale: 0.01,
    maxScale: 2.5
  })

export function clamp(
  value: number,
  firstBoundary: number,
  secondBoundary: number
): number {
  const lower = Math.min(firstBoundary, secondBoundary)
  const upper = Math.max(firstBoundary, secondBoundary)
  const safeValue = Number.isFinite(value) ? value : lower

  return Math.min(upper, Math.max(lower, safeValue))
}

export function clampCraftingViewportScale(
  scale: number,
  range: Partial<CraftingViewportScaleRange> = {}
): number {
  const { minScale, maxScale } = normalizeScaleRange(range)
  return clamp(scale, minScale, maxScale)
}

export function fitCraftingViewport(
  viewport: CraftingViewportSize,
  bounds: CraftingViewportBounds,
  options: FitCraftingViewportOptions = {}
): CraftingViewportTransform {
  const range = normalizeScaleRange(options)
  const width = positiveFinite(viewport.width)
  const height = positiveFinite(viewport.height)

  if (!width || !height) {
    return {
      x: 0,
      y: 0,
      scale: clampCraftingViewportScale(1, range)
    }
  }

  const padding = clamp(
    finiteOr(options.padding, 24),
    0,
    Math.min(width, height) / 2
  )
  const availableWidth = Math.max(1, width - padding * 2)
  const availableHeight = Math.max(1, height - padding * 2)
  const boundsWidth = Math.max(1, nonNegativeFinite(bounds.width))
  const boundsHeight = Math.max(1, nonNegativeFinite(bounds.height))
  const scale = clampCraftingViewportScale(
    Math.min(
      availableWidth / boundsWidth,
      availableHeight / boundsHeight
    ),
    range
  )
  const boundsX = finiteOr(bounds.x, 0)
  const boundsY = finiteOr(bounds.y, 0)
  const scaledWidth = boundsWidth * scale
  const scaledHeight = boundsHeight * scale

  return {
    x: (width - scaledWidth) / 2 - boundsX * scale,
    y: scaledHeight > availableHeight
      ? padding - boundsY * scale
      : (height - scaledHeight) / 2 - boundsY * scale,
    scale
  }
}

export function focusCraftingViewportBounds(
  viewport: CraftingViewportSize,
  bounds: CraftingViewportBounds,
  options: FocusCraftingViewportBoundsOptions = {}
): CraftingViewportTransform {
  const width = positiveFinite(viewport.width)
  const height = positiveFinite(viewport.height)
  const scale = clampCraftingViewportScale(options.scale ?? 1, options)

  if (!width || !height) {
    return { x: 0, y: 0, scale }
  }

  const boundsCenterX = finiteOr(bounds.x, 0)
    + nonNegativeFinite(bounds.width) / 2
  const boundsCenterY = finiteOr(bounds.y, 0)
    + nonNegativeFinite(bounds.height) / 2
  const verticalAnchor = clamp(
    finiteOr(options.verticalAnchor, 0.28),
    0,
    1
  )

  return {
    x: width / 2 - boundsCenterX * scale,
    y: height * verticalAnchor - boundsCenterY * scale,
    scale
  }
}

export function zoomCraftingViewportAt(
  transform: CraftingViewportTransform,
  point: CraftingViewportPoint,
  requestedScale: number,
  range: Partial<CraftingViewportScaleRange> = {}
): CraftingViewportTransform {
  const previousScale = positiveFinite(transform.scale) ?? 1
  const nextScale = clampCraftingViewportScale(requestedScale, range)
  const pointX = finiteOr(point.x, 0)
  const pointY = finiteOr(point.y, 0)
  const transformX = finiteOr(transform.x, 0)
  const transformY = finiteOr(transform.y, 0)
  const ratio = nextScale / previousScale

  return {
    x: pointX - (pointX - transformX) * ratio,
    y: pointY - (pointY - transformY) * ratio,
    scale: nextScale
  }
}

export function clampCraftingViewportPan(
  transform: CraftingViewportTransform,
  viewport: CraftingViewportSize,
  bounds: CraftingViewportBounds,
  options: ClampCraftingViewportPanOptions = {}
): CraftingViewportTransform {
  const viewportWidth = positiveFinite(viewport.width)
  const viewportHeight = positiveFinite(viewport.height)
  if (!viewportWidth || !viewportHeight) return transform

  const scale = positiveFinite(transform.scale) ?? 1
  const boundsX = finiteOr(bounds.x, 0)
  const boundsY = finiteOr(bounds.y, 0)
  const boundsWidth = Math.max(1, nonNegativeFinite(bounds.width))
  const boundsHeight = Math.max(1, nonNegativeFinite(bounds.height))
  const visibleMargin = clamp(
    finiteOr(options.visibleMargin, 48),
    0,
    Math.min(viewportWidth, viewportHeight) / 2
  )

  return {
    x: clamp(
      finiteOr(transform.x, 0),
      visibleMargin - (boundsX + boundsWidth) * scale,
      viewportWidth - visibleMargin - boundsX * scale
    ),
    y: clamp(
      finiteOr(transform.y, 0),
      visibleMargin - (boundsY + boundsHeight) * scale,
      viewportHeight - visibleMargin - boundsY * scale
    ),
    scale
  }
}

function normalizeScaleRange(
  range: Partial<CraftingViewportScaleRange>
): CraftingViewportScaleRange {
  const first = positiveFinite(range.minScale)
    ?? DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE.minScale
  const second = positiveFinite(range.maxScale)
    ?? DEFAULT_CRAFTING_VIEWPORT_SCALE_RANGE.maxScale

  return {
    minScale: Math.min(first, second),
    maxScale: Math.max(first, second)
  }
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback
}

function nonNegativeFinite(value: number): number {
  return Math.max(0, finiteOr(value, 0))
}

function positiveFinite(value: number | undefined): number | undefined {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value > 0
    ? value
    : undefined
}
