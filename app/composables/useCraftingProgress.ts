import { useStorage } from '@vueuse/core'
import type { InjectionKey, Ref } from 'vue'
import type {
  CraftingMode,
  CraftingProgressState
} from '../types/crafting'

export interface CraftingProgress {
  state: Ref<CraftingProgressState>
  addOwned: (targetKey: string, count: number) => void
  clearOwned: (targetKey: string) => void
  setMode: (targetKey: string, mode?: CraftingMode) => void
  selectRecipe: (targetKey: string, recipeId: string) => void
  selectOption: (requirementKey: string, targetKey: string) => void
  reset: () => void
}

const storageKey = 'matcha-wiki:crafting-progress:v1'
const craftingProgressKey: InjectionKey<CraftingProgress>
  = Symbol('matcha-crafting-progress')

export function provideCraftingProgress(): CraftingProgress {
  const state = useStorage<CraftingProgressState>(
    storageKey,
    emptyProgress(),
    undefined,
    {
      initOnMounted: true,
      mergeDefaults: true
    }
  )

  const progress: CraftingProgress = {
    state,
    addOwned(targetKey, count) {
      const safeCount = Math.max(0, Math.floor(count))
      if (!safeCount) return

      state.value = {
        ...state.value,
        ownedByTarget: {
          ...state.value.ownedByTarget,
          [targetKey]: (state.value.ownedByTarget[targetKey] ?? 0) + safeCount
        }
      }
    },
    clearOwned(targetKey) {
      state.value = {
        ...state.value,
        ownedByTarget: withoutKey(state.value.ownedByTarget, targetKey)
      }
    },
    setMode(targetKey, mode) {
      state.value = {
        ...state.value,
        modeByTarget: mode
          ? { ...state.value.modeByTarget, [targetKey]: mode }
          : withoutKey(state.value.modeByTarget, targetKey)
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
    },
    reset() {
      state.value = emptyProgress()
    }
  }

  provide(craftingProgressKey, progress)
  return progress
}

export function useCraftingProgress(): CraftingProgress {
  const progress = inject(craftingProgressKey)
  if (!progress) {
    throw new Error('Crafting progress must be provided by ItemCraftingPath')
  }
  return progress
}

function emptyProgress(): CraftingProgressState {
  return {
    ownedByTarget: {},
    modeByTarget: {},
    recipeByTarget: {},
    optionByRequirement: {}
  }
}

function withoutKey<T>(
  record: Record<string, T>,
  key: string
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).filter(([entryKey]) => entryKey !== key)
  )
}
