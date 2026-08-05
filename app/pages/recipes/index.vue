<template>
  <article class="index-page">
    <header class="page-heading">
      <p class="eyebrow">Справочник</p>
      <h1>Рецепты</h1>
      <p>
        Все найденные способы изготовления: что положить в ячейки, где готовить
        и сколько предметов получится.
      </p>
    </header>

    <div class="catalog-controls">
      <label class="catalog-search">
        <PhMagnifyingGlass :size="20" />
        <span class="visually-hidden">Поиск рецепта</span>
        <input
          v-model="query"
          name="recipe-search"
          type="search"
          placeholder="Результат или ингредиент…"
          autocomplete="off"
          spellcheck="false"
        >
      </label>
      <label>
        <span class="visually-hidden">Рабочая станция</span>
        <select
          v-model="station"
          name="recipe-station"
        >
          <option
            v-for="option in stations"
            :key="option"
          >
            {{ option }}
          </option>
        </select>
      </label>
      <p aria-live="polite">Показано: {{ filteredRecipes.length }}</p>
    </div>

    <ul class="recipe-index">
      <li
        v-for="recipe in filteredRecipes.slice(0, visible)"
        :key="recipe.id"
      >
        <NuxtLink :to="recipeLink(recipe)">
          <span class="index-icon">
            <img
              v-if="recipe.result?.icon"
              :src="useAssetPath(recipe.result.icon)"
              alt=""
              width="40"
              height="40"
              loading="lazy"
              decoding="async"
            >
          </span>
          <span>
            <strong>
              <MinecraftText :text="recipeResultTitle(recipe)" />
            </strong>
            <small>
              <template
                v-for="(ingredient, index) in recipe.ingredients"
                :key="`${ingredient.label}:${index}`"
              >
                <template v-if="index">, </template><MinecraftText :text="ingredient.label" />
              </template>
            </small>
          </span>
          <em>{{ recipe.station }}</em>
        </NuxtLink>
      </li>
    </ul>

    <button
      v-if="visible < filteredRecipes.length"
      class="load-more"
      type="button"
      @click="visible += 120"
    >
      Показать ещё {{ Math.min(120, filteredRecipes.length - visible) }}
    </button>
  </article>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import type { RecipeView } from '../../types/wiki'

const catalog = useWikiCatalog()
const route = useRoute()
const router = useRouter()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const station = ref(typeof route.query.station === 'string' ? route.query.station : 'Все')
const visible = ref(120)

const stations = computed(() => [
  'Все',
  ...new Set(catalog.recipes.map(recipe => recipe.station))
])

const filteredRecipes = computed(() => {
  const needle = query.value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim()

  return catalog.recipes.filter((recipe) => {
    if (station.value !== 'Все' && recipe.station !== station.value) {
      return false
    }
    if (!needle) {
      return true
    }
    const haystack = [
      recipe.id,
      recipeResultTitle(recipe),
      recipe.result?.name,
      recipe.result?.carrier,
      ...recipe.ingredients.flatMap(ingredient => [ingredient.label, ingredient.tag, ...ingredient.ids])
    ].filter(Boolean).join(' ').toLocaleLowerCase('ru-RU').replaceAll('ё', 'е')
    return haystack.includes(needle)
  })
})

watch([query, station], () => {
  visible.value = 120
})

watchDebounced(
  [query, station],
  ([nextQuery, nextStation]) => {
    void router.replace({
      query: {
        ...route.query,
        q: nextQuery.trim() || undefined,
        station: nextStation === 'Все' ? undefined : nextStation
      }
    })
  },
  { debounce: 180 }
)

function recipeResultTitle(recipe: RecipeView): string {
  if (!recipe.result) return recipe.id
  return resolveStackItem(catalog.items, recipe.result)?.title ?? recipe.result.name
}

function recipeLink(recipe: RecipeView): string {
  const item = recipe.result
    ? resolveStackItem(catalog.items, recipe.result)
    : undefined
  return item
    ? `/items/${item.slug}`
    : recipePath(recipe.namespace, recipe.path)
}

useWikiSeo({
  title: 'Рецепты',
  description: `Все ${catalog.stats.recipes} способов изготовления в Matcha Flavoured: ингредиенты, рабочие места и результат.`
})
</script>

<style scoped lang="scss">
.index-page {
  .catalog-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;

    .catalog-search {
      min-width: min(100%, 360px);
      min-height: 48px;
      display: flex;
      flex: 1;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      background: var(--surface);
      border: 1px solid var(--edge);

      &:focus-within {
        border-color: var(--accent);
      }

      input {
        min-width: 0;
        flex: 1;
        padding: 12px 0;
        background: transparent;
        border: 0;
        outline: 0;
      }
    }

    select {
      min-height: 48px;
      max-width: 240px;
      padding: 0 34px 0 12px;
      background: var(--surface);
      border: 1px solid var(--edge);
    }

    p {
      margin: 0 0 0 8px;
      color: var(--muted);
      font-size: 13px;
      white-space: nowrap;
    }
  }

  .recipe-index {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      content-visibility: auto;
      contain-intrinsic-size: 70px;

      + li {
        border-top: 1px solid var(--edge);
      }
    }

    a {
      min-height: 70px;
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr) 130px;
      align-items: center;
      gap: 14px;
      padding: 9px 8px;
      color: var(--ink);
      text-decoration: none;

      &:hover {
        color: var(--ink);
        background: var(--surface-quiet);
      }
    }

    .index-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        width: 40px;
        height: 40px;
        object-fit: contain;
        image-rendering: pixelated;
      }
    }

    a > span:nth-child(2) {
      min-width: 0;
      display: flex;
      flex-direction: column;

      strong,
      small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      small {
        color: var(--muted);
      }
    }

    em {
      color: var(--muted);
      font-size: 13px;
      font-style: normal;
      text-align: right;
    }
  }

  .load-more {
    min-height: 48px;
    margin-top: 28px;
    padding: 0 18px;
    color: var(--surface);
    background: var(--accent);
    border: 0;
    font-weight: 800;

    &:hover {
      background: var(--accent-ink);
    }
  }

  @media (max-width: 680px) {
    .catalog-controls {
      align-items: stretch;
      flex-direction: column;

      select {
        width: 100%;
        max-width: none;
      }

      p {
        margin: 2px 0 0;
      }
    }

    .recipe-index {
      a {
        grid-template-columns: 48px minmax(0, 1fr);
      }

      em {
        grid-column: 2;
        text-align: left;
      }
    }
  }
}
</style>
