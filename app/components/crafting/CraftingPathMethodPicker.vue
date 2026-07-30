<template>
  <div class="method">
    <div
      class="switch"
      role="group"
      :aria-label="`Способ получения: ${plainTitle}`"
    >
      <button
        type="button"
        :aria-pressed="selectedMode !== 'obtain'"
        @click="emit('select-mode', 'craft')"
      >
        Сделать
      </button>
      <button
        type="button"
        :aria-pressed="selectedMode === 'obtain'"
        @click="emit('select-mode', 'obtain')"
      >
        Найти
      </button>
    </div>

    <label v-if="node.recipeOptions.length > 1 && node.state === 'craft'">
      <span>Способ изготовления</span>
      <select
        :value="node.recipe?.id"
        @change="selectRecipe"
      >
        <option
          v-for="recipe in node.recipeOptions"
          :key="recipe.id"
          :value="recipe.id"
        >
          {{ recipeLabel(recipe) }}
        </option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import type {
  CraftingMode,
  CraftingPlanNode,
  CraftingRecipeView
} from '../../types/crafting'

const props = defineProps<{
  node: CraftingPlanNode
  selectedMode?: CraftingMode
}>()

const emit = defineEmits<{
  'select-mode': [mode: CraftingMode]
  'select-recipe': [recipeId: string]
}>()

const plainTitle = computed(() => (
  stripMinecraftFormatting(props.node.target.title)
))

function selectRecipe(event: Event): void {
  emit('select-recipe', (event.target as HTMLSelectElement).value)
}

function recipeLabel(recipe: CraftingRecipeView): string {
  const ingredients = recipe.requirements
    .map((requirement) => {
      const count = requirement.count > 1 ? `${requirement.count} × ` : ''
      return `${count}${stripMinecraftFormatting(requirement.ingredient.label)}`
    })
    .join(' + ')
  const method = ingredients
    ? `${recipe.station}: ${ingredients}`
    : recipe.station
  return recipe.resultCount > 1
    ? `${method}, получится ${recipe.resultCount}`
    : method
}
</script>

<style scoped lang="scss">
.method {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px 18px;
  margin: 12px 0 0 54px;

  .switch {
    display: inline-flex;
    padding: 2px;
    background: var(--surface-deep);

    button {
      min-height: 34px;
      padding: 5px 10px;
      color: var(--muted);
      background: transparent;
      border: 0;
      font-size: 12px;

      &[aria-pressed='true'] {
        color: var(--ink);
        background: var(--surface);
      }
    }
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;

    span {
      color: var(--muted);
      font-size: 11px;
    }

    select {
      min-height: 36px;
      max-width: min(320px, 70vw);
      padding: 5px 30px 5px 9px;
      background: var(--surface);
      border: 1px solid var(--edge);
      font-size: 12px;
    }
  }
}

@media (max-width: 620px) {
  .method {
    margin-left: 0;
  }
}
</style>
