<template>
  <figure
    class="panel"
    :aria-label="typeTitle"
  >
    <figcaption>
      <strong>{{ typeTitle }}</strong>
      <span>{{ recipe.station }}</span>
    </figcaption>

    <div class="body">
      <div class="scheme">
        <div
          v-if="kind === 'crafting_shaped'"
          class="grid"
        >
          <template
            v-for="(row, rowIndex) in shapedGrid"
            :key="rowIndex"
          >
            <ItemSlot
              v-for="(ingredient, columnIndex) in row"
              :key="columnIndex"
              :ingredient="ingredient ?? undefined"
              :empty="!ingredient"
            />
          </template>
        </div>

        <div
          v-else-if="kind === 'crafting_shapeless'"
          class="shapeless"
        >
          <div class="grid">
            <ItemSlot
              v-for="(ingredient, index) in shapelessItems"
              :key="index"
              :ingredient="ingredient"
              :empty="!ingredient"
            />
          </div>
          <p>Порядок ингредиентов не важен</p>
        </div>

        <div
          v-else-if="kind === 'smithing_transform'"
          class="smithing"
        >
          <div
            v-for="slot in smithingSlots"
            :key="slot.label"
            class="labelled"
          >
            <ItemSlot
              :ingredient="slot.ingredient"
              :empty="!slot.ingredient"
            />
            <small>{{ slot.label }}</small>
          </div>
        </div>

        <div
          v-else
          class="single"
        >
          <ItemSlot
            :ingredient="firstIngredient"
            :empty="!firstIngredient"
          />
          <small v-if="kind === 'stonecutting'">Вход в камнерез</small>
        </div>
      </div>

      <PhArrowRight
        class="arrow"
        :size="28"
        weight="bold"
        aria-hidden="true"
      />

      <div class="result">
        <ItemSlot
          v-if="recipe.result"
          :stack="recipe.result"
          large
        />
        <ItemSlot
          v-else
          empty
          large
        />
        <small>{{ recipe.result?.name ?? 'Результат неизвестен' }}</small>
      </div>
    </div>

    <p
      v-if="isCooking && (cookingSeconds !== null || recipe.experience !== undefined)"
      class="meta"
    >
      <span v-if="cookingSeconds !== null">Время: {{ cookingSeconds }} с</span>
      <span v-if="recipe.experience !== undefined">Опыт: {{ recipe.experience }}</span>
    </p>

    <p class="summary">{{ summary }}</p>
    <NuxtLink
      class="details"
      :to="detailsLink"
    >
      Открыть рецепт и источник
    </NuxtLink>
  </figure>
</template>

<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import type { IngredientView, RecipeView } from '../types/wiki'

const props = defineProps<{
  recipe: RecipeView
}>()

const kind = computed(() => props.recipe.type.replace(/^.*:/, ''))
const typeTitles: Record<string, string> = {
  crafting_shaped: 'Верстак: рецепт с формой',
  crafting_shapeless: 'Верстак: бесформенный рецепт',
  stonecutting: 'Резка на камнерезе',
  smithing_transform: 'Кузнечное преобразование',
  smelting: 'Плавка',
  blasting: 'Плавка в плавильной печи',
  smoking: 'Копчение',
  campfire_cooking: 'Готовка на костре'
}
const typeTitle = computed(() => typeTitles[kind.value] ?? 'Рецепт')
const shapedGrid = computed<Array<Array<IngredientView | null>>>(() => {
  return Array.from({ length: 3 }, (_, rowIndex) => {
    const row = props.recipe.pattern?.[rowIndex] ?? ''
    return Array.from({ length: 3 }, (_, columnIndex) => {
      const symbol = row.charAt(columnIndex)
      return symbol && symbol !== ' ' ? props.recipe.key?.[symbol] ?? null : null
    })
  })
})
const shapelessItems = computed<Array<IngredientView | undefined>>(() => (
  Array.from({ length: 9 }, (_, index) => props.recipe.ingredients[index])
))
const smithingSlots = computed(() => (
  ['Шаблон', 'Основа', 'Добавка'].map((label, index) => ({
    label,
    ingredient: props.recipe.ingredients[index]
  }))
))
const firstIngredient = computed(() => props.recipe.ingredients[0])
const isCooking = computed(() => (
  ['smelting', 'blasting', 'smoking', 'campfire_cooking'].includes(kind.value)
))
const cookingSeconds = computed(() => (
  props.recipe.cookingTime === undefined ? null : props.recipe.cookingTime / 20
))
const summary = computed(() => {
  const names = [...new Set(props.recipe.ingredients.map(ingredient => ingredient.label))]
  const result = props.recipe.result
  const output = result
    ? `${result.name}${result.count > 1 ? ` x${result.count}` : ''}`
    : 'Результат неизвестен'
  return names.length ? `${output}. Ингредиенты: ${names.join(', ')}` : output
})
const detailsLink = computed(() => `/recipes/${props.recipe.namespace}/${props.recipe.path}`)
</script>

<style scoped lang="scss">
.panel {
  box-sizing: border-box;
  max-width: 600px;
  margin: 0;
  padding: 14px;
  color: var(--recipe-ink);
  background: var(--recipe-surface);
  border: 2px solid var(--recipe-edge);
  box-shadow:
    inset 2px 2px 0 var(--recipe-highlight),
    inset -2px -2px 0 var(--recipe-shadow);

  figcaption {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 16px;

    strong {
      font-size: 15px;
    }

    span {
      color: var(--recipe-muted);
      font-size: 13px;
    }
  }

  .body {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 14px;

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 44px);
      gap: 2px;
    }

    .shapeless p {
      margin: 7px 0 0;
      color: var(--recipe-muted);
      font-size: 12px;
    }

    .smithing {
      display: flex;
      gap: 8px;
    }

    .labelled,
    .single,
    .result {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    small {
      max-width: 108px;
      font-size: 12px;
      line-height: 1.25;
      text-align: center;
      overflow-wrap: anywhere;
    }

    .arrow {
      flex: none;
      color: var(--recipe-muted);
    }
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
    margin: 12px 0 0;
    font-size: 13px;
  }

  .summary {
    margin: 9px 0 0;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .details {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--recipe-link);
    font-size: 14px;
    font-weight: 700;
  }

  @media (max-width: 520px) {
    .body {
      flex-direction: column;

      .arrow {
        transform: rotate(90deg);
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .arrow {
      transition: none;
    }
  }
}
</style>
