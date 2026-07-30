import { describe, expect, it } from 'vitest'
import {
  clamp,
  clampCraftingViewportPan,
  clampCraftingViewportScale,
  fitCraftingViewport,
  zoomCraftingViewportAt
} from '../app/utils/craftingViewport'

describe('crafting viewport math', () => {
  it('clamps values even when boundaries arrive in reverse order', () => {
    expect(clamp(12, 10, 2)).toBe(10)
    expect(clamp(-2, 10, 2)).toBe(2)
    expect(clamp(6, 10, 2)).toBe(6)
  })

  it('uses a safe scale for invalid and out-of-range values', () => {
    const range = { minScale: 0.5, maxScale: 2 }

    expect(clampCraftingViewportScale(Number.NaN, range)).toBe(0.5)
    expect(clampCraftingViewportScale(0.1, range)).toBe(0.5)
    expect(clampCraftingViewportScale(4, range)).toBe(2)
  })

  it('fits and centers wide content inside the padded viewport', () => {
    expect(fitCraftingViewport(
      { width: 800, height: 600 },
      { x: 0, y: 0, width: 1000, height: 400 },
      { padding: 40, minScale: 0.2, maxScale: 2 }
    )).toEqual({
      x: 40,
      y: 156,
      scale: 0.72
    })
  })

  it('keeps very wide crafting routes readable at the default overview scale', () => {
    const transform = fitCraftingViewport(
      { width: 358, height: 560 },
      { x: 0, y: 0, width: 18_568, height: 1_572 },
      { padding: 34 }
    )

    expect(transform.scale).toBe(0.35)
    expect(transform.y).toBe(34)
  })

  it('accounts for non-zero content bounds when centering', () => {
    expect(fitCraftingViewport(
      { width: 500, height: 300 },
      { x: 100, y: 50, width: 200, height: 100 },
      { padding: 0, minScale: 0.1, maxScale: 1 }
    )).toEqual({
      x: 50,
      y: 50,
      scale: 1
    })
  })

  it('keeps the root edge visible when a tall graph hits minimum scale', () => {
    expect(fitCraftingViewport(
      { width: 360, height: 560 },
      { x: 100, y: 50, width: 800, height: 2400 },
      { padding: 32, minScale: 0.35, maxScale: 2 }
    )).toEqual({
      x: 5,
      y: 14.5,
      scale: 0.35
    })
  })

  it('returns a stable transform before the viewport is measured', () => {
    expect(fitCraftingViewport(
      { width: 0, height: 600 },
      { x: 10, y: 20, width: 300, height: 200 },
      { minScale: 0.4, maxScale: 2 }
    )).toEqual({
      x: 0,
      y: 0,
      scale: 1
    })
  })

  it('keeps the world point beneath the cursor fixed while zooming', () => {
    const point = { x: 110, y: 70 }
    const before = { x: 10, y: 20, scale: 1 }
    const after = zoomCraftingViewportAt(
      before,
      point,
      2,
      { minScale: 0.5, maxScale: 3 }
    )

    expect(after).toEqual({
      x: -90,
      y: -30,
      scale: 2
    })
    expect((point.x - after.x) / after.scale)
      .toBe((point.x - before.x) / before.scale)
    expect((point.y - after.y) / after.scale)
      .toBe((point.y - before.y) / before.scale)
  })

  it('applies the scale limit before calculating the focal transform', () => {
    expect(zoomCraftingViewportAt(
      { x: 0, y: 0, scale: 1 },
      { x: 50, y: 50 },
      10,
      { minScale: 0.5, maxScale: 2 }
    )).toEqual({
      x: -50,
      y: -50,
      scale: 2
    })
  })

  it('keeps a recoverable part of the graph visible after panning', () => {
    expect(clampCraftingViewportPan(
      { x: -2000, y: 2000, scale: 1 },
      { width: 800, height: 600 },
      { x: 0, y: 0, width: 1000, height: 400 },
      { visibleMargin: 48 }
    )).toEqual({
      x: -952,
      y: 552,
      scale: 1
    })
  })

  it('clamps transformed bounds that do not start at the origin', () => {
    expect(clampCraftingViewportPan(
      { x: 900, y: -900, scale: 2 },
      { width: 500, height: 300 },
      { x: 100, y: 50, width: 200, height: 100 },
      { visibleMargin: 40 }
    )).toEqual({
      x: 260,
      y: -260,
      scale: 2
    })
  })
})
