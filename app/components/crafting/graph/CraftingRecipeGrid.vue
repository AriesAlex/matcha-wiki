<template>
  <span
    class="recipe-slots"
    :class="displayKind"
    role="img"
    :aria-label="accessibleLabel"
  >
    <ItemSlotSurface
      v-for="(slot, index) in slots"
      :key="index"
      :icon-url="slot?.iconUrl"
      :display-name="slot?.name"
      :fallback-mark="slot?.fallbackMark"
      :empty="!slot"
    />
  </span>
</template>

<script setup lang="ts">
import type { IngredientView } from '../../../types/wiki'
import type { CraftingRecipeView } from '../../../types/crafting'

interface DisplaySlot {
  iconUrl: string
  name: string
  fallbackMark: string
}

const props = defineProps<{
  recipe: CraftingRecipeView
}>()

const displayKind = computed(() => craftingRecipeDisplayKind(props.recipe))
const ingredients = computed<Array<IngredientView | null>>(() => (
  displayKind.value === 'grid'
    ? craftingRecipeGridSlots(props.recipe)
    : craftingRecipeCompactSlots(props.recipe)
))
const slots = computed<Array<DisplaySlot | null>>(() => (
  ingredients.value.map((ingredient) => {
    if (!ingredient) return null
    return {
      iconUrl: ingredient.icons[0]
        ? useAssetPath(ingredient.icons[0])
        : '',
      name: stripMinecraftFormatting(ingredient.label),
      fallbackMark: ingredient.tag ? '#' : '?'
    }
  })
))
const accessibleLabel = computed(() => craftingRecipeLayoutLabel(props.recipe))
</script>

<style scoped lang="scss">
.recipe-slots {
  display: grid;
  gap: 2px;
  pointer-events: none;

  &.grid {
    grid-template-columns: repeat(3, 44px);
  }

  &.smithing {
    grid-template-columns: repeat(3, 44px);
  }

  &.single {
    grid-template-columns: 44px;
  }
}
</style>
