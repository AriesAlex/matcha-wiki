<template>
  <label>
    <span>{{ label }}</span>
    <select
      :value="selectedId"
      @change="selectRecipe"
    >
      <option
        v-for="recipe in recipes"
        :key="recipe.id"
        :value="recipe.id"
      >
        {{ recipeLabel(recipe) }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import type { CraftingRecipeView } from '../../../types/crafting'

withDefaults(defineProps<{
  recipes: readonly CraftingRecipeView[]
  selectedId: string
  label?: string
}>(), {
  label: 'Рецепт'
})

const emit = defineEmits<{
  select: [recipeId: string]
}>()

function selectRecipe(event: Event): void {
  emit('select', (event.target as HTMLSelectElement).value)
}

function recipeLabel(recipe: CraftingRecipeView): string {
  const ingredients = recipe.requirements
    .map((requirement) => {
      const count = requirement.count > 1 ? `${requirement.count} × ` : ''
      return `${count}${stripMinecraftFormatting(requirement.ingredient.label)}`
    })
    .join(' + ')
  return ingredients
    ? `${recipe.station}: ${ingredients}`
    : recipe.station
}
</script>

<style scoped lang="scss">
label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 14px;

  span {
    color: var(--muted);
    font-size: 11px;
  }

  select {
    width: 100%;
    min-height: 44px;
    padding: 7px 32px 7px 10px;
    background: var(--surface);
    border: 1px solid var(--edge);
    font-size: 12px;
  }
}
</style>
