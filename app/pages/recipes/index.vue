<template>
  <article class="index-page">
    <header class="page-heading">
      <p class="eyebrow">Справочник</p>
      <h1>Рецепты</h1>
      <p>
        Каталог построен напрямую из JSON. Он сохраняет регистр символов pattern,
        варианты тегов, количество, время, опыт и полный набор components результата.
      </p>
    </header>

    <div class="catalog-controls">
      <label class="catalog-search">
        <PhMagnifyingGlass :size="20" />
        <span class="visually-hidden">Поиск рецепта</span>
        <input
          v-model="query"
          type="search"
          placeholder="Результат, ингредиент или ID"
        >
      </label>
      <label>
        <span class="visually-hidden">Рабочая станция</span>
        <select v-model="station">
          <option
            v-for="option in stations"
            :key="option"
          >
            {{ option }}
          </option>
        </select>
      </label>
      <p>Найдено: {{ filteredRecipes.length }}</p>
    </div>

    <ul class="recipe-index">
      <li
        v-for="recipe in filteredRecipes.slice(0, visible)"
        :key="recipe.id"
      >
        <NuxtLink :to="recipePath(recipe.namespace, recipe.path)">
          <span class="index-icon">
            <img
              v-if="recipe.result?.icon"
              :src="useAssetPath(recipe.result.icon)"
              alt=""
              width="40"
              height="40"
            >
          </span>
          <span>
            <strong>{{ stripMinecraftFormatting(recipe.result?.name ?? recipe.id) }}</strong>
            <small>{{ recipe.ingredients.map(ingredient => ingredient.label).join(', ') }}</small>
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
import { PhMagnifyingGlass } from '@phosphor-icons/vue'

const catalog = useWikiCatalog()
const query = ref('')
const station = ref('Все')
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

useSeoMeta({
  title: 'Рецепты',
  description: `Все ${catalog.stats.recipes} рецептов Matcha Flavoured: верстак, печи, костёр, камнерез и кузнечный стол.`
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

    li + li {
      border-top: 1px solid var(--edge);
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
