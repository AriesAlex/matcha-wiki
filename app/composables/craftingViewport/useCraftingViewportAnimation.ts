import type { usePreferredReducedMotion } from '@vueuse/core'
import {
  computed,
  onBeforeUnmount,
  shallowRef
} from 'vue'

export function useCraftingViewportAnimation(
  preferredMotion: ReturnType<typeof usePreferredReducedMotion>,
  duration: () => number | undefined
) {
  const isAnimating = shallowRef(false)
  const animationDuration = computed(() => (
    preferredMotion.value === 'reduce'
      ? 0
      : Math.max(0, duration() ?? 180)
  ))
  let animationTimer: ReturnType<typeof setTimeout> | undefined

  onBeforeUnmount(stopAnimation)

  function startAnimation(duration: number): void {
    stopAnimation()
    isAnimating.value = true
    animationTimer = setTimeout(() => {
      animationTimer = undefined
      isAnimating.value = false
    }, duration)
  }

  function stopAnimation(): void {
    if (animationTimer !== undefined) {
      clearTimeout(animationTimer)
      animationTimer = undefined
    }
    isAnimating.value = false
  }

  return {
    isAnimating,
    animationDuration,
    startAnimation,
    stopAnimation
  }
}
