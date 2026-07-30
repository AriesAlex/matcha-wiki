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
        <small>
          <ItemReference
            v-if="resultItem"
            :item="resultItem"
          >
            <MinecraftText :text="resultName" />
          </ItemReference>
          <MinecraftText
            v-else
            :text="resultName"
          />
        </small>
      </div>
    </div>

    <p
      v-if="isCooking && (cookingSeconds !== null || recipe.experience !== undefined)"
      class="meta"
    >
      <span v-if="cookingSeconds !== null">Время: {{ cookingSeconds }} с</span>
      <span v-if="recipe.experience !== undefined">Опыт: {{ recipe.experience }}</span>
    </p>

    <p class="summary">
      <template v-if="recipe.result">
        <ItemReference
          v-if="resultItem"
          :item="resultItem"
          class="summary-link"
        >
          <MinecraftText :text="resultName" />
        </ItemReference>
        <MinecraftText
          v-else
          :text="resultName"
        />
        <template v-if="recipe.result.count > 1"> ×{{ recipe.result.count }}</template>
      </template>
      <template v-else>Результат неизвестен</template>
      <template v-if="ingredientReferences.length">
        . Ингредиенты:
        <template
          v-for="(entry, index) in ingredientReferences"
          :key="entry.key"
        >
          <template v-if="index">, </template>
          <ItemReference
            v-if="entry.item"
            :item="entry.item"
            class="summary-link"
          >
            <MinecraftText :text="entry.item.title" />
          </ItemReference>
          <ItemReference
            v-else
            :ingredient="entry.ingredient"
            class="ingredient-reference"
          >
            <MinecraftText :text="entry.ingredient.label" />
          </ItemReference>
        </template>
      </template>
    </p>
    <NuxtLink
      v-if="showDetailsLink"
      class="details"
      :to="detailsLink"
    >
      {{ detailsLabel }}
    </NuxtLink>
  </figure>
</template>

<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import type { IngredientView, RecipeView } from '../types/wiki'

const props = defineProps<{
  recipe: RecipeView
}>()

const catalog = useWikiCatalog()
const route = useRoute()
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
const resultItem = computed(() => (
  props.recipe.result ? resolveStackItem(catalog.items, props.recipe.result) : undefined
))
const resultName = computed(() => (
  resultItem.value?.title ?? props.recipe.result?.name ?? 'Результат неизвестен'
))
const ingredientReferences = computed(() => {
  const uniqueIngredients = new Map(
    props.recipe.ingredients.map(ingredient => [
      JSON.stringify({
        label: ingredient.label,
        tag: ingredient.tag,
        ids: ingredient.ids
      }),
      ingredient
    ])
  )
  return [...uniqueIngredients].map(([key, ingredient]) => ({
    key,
    ingredient,
    item: resolveIngredientItem(catalog.items, ingredient)
  }))
})
const recipeDetailsLink = computed(() => (
  `/recipes/${props.recipe.namespace}/${props.recipe.path}`
))
const detailsLink = computed(() => (
  resultItem.value
    ? `/items/${resultItem.value.slug}`
    : recipeDetailsLink.value
))
const detailsLabel = computed(() => (
  resultItem.value
    ? 'Открыть страницу предмета'
    : 'Открыть способ изготовления'
))
const showDetailsLink = computed(() => normalizeWikiPath(route.path) !== detailsLink.value)
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

    .result small .item-reference.linked {
      color: var(--recipe-link);
      text-decoration: underline;
      text-underline-offset: 0.2em;
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

    .summary-link.linked {
      color: var(--recipe-link);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    .ingredient-reference {
      cursor: help;
    }
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
