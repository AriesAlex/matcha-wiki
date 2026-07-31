import { useStorage } from '@vueuse/core'
import type { Ref } from 'vue'
import type { CraftingProgressState } from '../types/crafting'

interface CraftingProgress {
  state: Ref<CraftingProgressState>
  setOwnedBatch: (ownedByTarget: Record<string, number>) => void
  clearOwnedBatch: (targetKeys: string[]) => void
  selectRecipe: (targetKey: string, recipeId: string) => void
  selectOption: (requirementKey: string, targetKey: string) => void
}

const storageKey = 'matcha-wiki:crafting-progress:v1'

export function useCraftingProgress(): CraftingProgress {
  const state = useStorage<CraftingProgressState>(
    storageKey,
    emptyProgress(),
    undefined,
    {
      initOnMounted: true,
      mergeDefaults: true
    }
  )

  watch(state, (value) => {
    if (!('modeByTarget' in value)) return
    state.value = normalizeProgressState(value)
  }, { immediate: true })

  const progress: CraftingProgress = {
    state,
    setOwnedBatch(ownedByTarget) {
      const nextOwnedByTarget = new Map(
        Object.entries(state.value.ownedByTarget)
      )
      for (const [targetKey, count] of Object.entries(ownedByTarget)) {
        const safeCount = normalizeOwnedCount(count)
        if (safeCount) {
          nextOwnedByTarget.set(targetKey, safeCount)
        } else {
          nextOwnedByTarget.delete(targetKey)
        }
      }

      state.value = {
        ...state.value,
        ownedByTarget: Object.fromEntries(nextOwnedByTarget)
      }
    },
    clearOwnedBatch(targetKeys) {
      const keys = new Set(targetKeys)
      state.value = {
        ...state.value,
        ownedByTarget: Object.fromEntries(
          Object.entries(state.value.ownedByTarget)
            .filter(([targetKey]) => !keys.has(targetKey))
        )
      }
    },
    selectRecipe(targetKey, recipeId) {
      state.value = {
        ...state.value,
        recipeByTarget: {
          ...state.value.recipeByTarget,
          [targetKey]: recipeId
        }
      }
    },
    selectOption(requirementKey, targetKey) {
      state.value = {
        ...state.value,
        optionByRequirement: {
          ...state.value.optionByRequirement,
          [requirementKey]: targetKey
        }
      }
    }
  }

  return progress
}

function emptyProgress(): CraftingProgressState {
  return {
    ownedByTarget: {},
    recipeByTarget: {},
    optionByRequirement: {}
  }
}

function normalizeProgressState(
  value: CraftingProgressState
): CraftingProgressState {
  return {
    ownedByTarget: value.ownedByTarget ?? {},
    recipeByTarget: value.recipeByTarget ?? {},
    optionByRequirement: value.optionByRequirement ?? {}
  }
}

function normalizeOwnedCount(count: number): number {
  return Math.max(
    0,
    Math.floor(Number.isFinite(count) ? count : 0)
  )
}
