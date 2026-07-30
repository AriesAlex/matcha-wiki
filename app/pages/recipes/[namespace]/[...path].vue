<template>
  <article v-if="recipe" class="recipe-page">
    <NuxtLink class="back-link" to="/recipes">
      <PhArrowLeft :size="18" />
      Все рецепты
    </NuxtLink>

    <header class="recipe-heading">
      <span class="item-heading-icon">
        <img
          v-if="recipe.result?.icon"
          :src="useAssetPath(recipe.result.icon)"
          alt=""
          width="72"
          height="72"
        >
      </span>
      <div>
        <p class="eyebrow">{{ recipe.station }}</p>
        <h1><MinecraftText :text="resultItem?.title ?? recipe.result?.name ?? recipe.id" /></h1>
        <code>{{ recipe.id }}</code>
      </div>
    </header>

    <RecipeViewer :recipe="recipe" />

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Текстовая версия</p>
        <h2>Ингредиенты</h2>
      </header>
      <ul class="ingredient-list">
        <li
          v-for="(entry, index) in ingredientEntries"
          :key="`${entry.ingredient.label}:${index}`"
        >
          <ItemSlot :ingredient="entry.ingredient" />
          <span>
            <ItemReference
              v-if="entry.item"
              :item="entry.item"
              class="ingredient-link"
            >
              <strong><MinecraftText :text="entry.item.title" /></strong>
            </ItemReference>
            <strong v-else>
              <MinecraftText :text="entry.ingredient.label" />
            </strong>
            <code v-if="entry.ingredient.tag">#{{ entry.ingredient.tag }}</code>
            <code v-else>{{ entry.ingredient.ids.join(' | ') }}</code>
          </span>
        </li>
      </ul>
      <p v-if="resultItem">
        Результат:
        <ItemReference :item="resultItem">
          <MinecraftText :text="resultItem.title" />
        </ItemReference>.
      </p>
    </section>

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Проверяемость</p>
        <h2>Источник и данные результата</h2>
      </header>
      <p class="source-callout">
        <PhGitBranch :size="20" />
        <code>{{ recipe.sourcePath }}</code>
      </p>
      <details class="technical-details">
        <summary><PhCode :size="18" /> Components результата</summary>
        <pre><code>{{ JSON.stringify(recipe.result?.components ?? {}, null, 2) }}</code></pre>
      </details>
    </section>
  </article>
</template>

<script setup lang="ts">
import { PhArrowLeft, PhCode, PhGitBranch } from '@phosphor-icons/vue'

const route = useRoute()
const catalog = useWikiCatalog()
const pathParts = Array.isArray(route.params.path) ? route.params.path : [route.params.path]
const recipeId = `${route.params.namespace}:${pathParts.join('/')}`
const recipe = computed(() => catalog.recipes.find(entry => entry.id === recipeId))

if (import.meta.server && !recipe.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Рецепт не найден'
  })
}

onMounted(() => {
  if (!recipe.value) {
    showError({
      statusCode: 404,
      statusMessage: 'Рецепт не найден'
    })
  }
})

const resultItem = computed(() => {
  const result = recipe.value?.result
  if (!result) return undefined
  return resolveStackItem(catalog.items, result)
})
const ingredientEntries = computed(() => (
  recipe.value?.ingredients.map(ingredient => ({
    ingredient,
    item: resolveIngredientItem(catalog.items, ingredient)
  })) ?? []
))

useSeoMeta({
  title: () => `Рецепт: ${stripMinecraftFormatting(
    resultItem.value?.title ?? recipe.value?.result?.name ?? recipeId
  )}`,
  description: () => {
    const current = recipe.value
    return current
      ? `${current.station}: ${current.ingredients.map(ingredient => ingredient.label).join(', ')}. Точный рецепт из ${current.sourcePath}.`
      : ''
  }
})
</script>

<style scoped lang="scss">
.recipe-page {
  .recipe-heading {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    align-items: center;
    gap: 26px;
    margin-bottom: 46px;

    .item-heading-icon {
      width: 104px;
      height: 104px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-quiet);
    }

    img {
      width: 72px;
      height: 72px;
      object-fit: contain;
      image-rendering: pixelated;
    }

    h1 {
      font-size: clamp(2.1rem, 5vw, 4rem);
    }

    code {
      display: block;
      margin-top: 9px;
      color: var(--muted);
      font-size: 13px;
    }
  }

  .ingredient-list {
    max-width: 760px;
    margin: 0 0 20px;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr);
      gap: 14px;
      align-items: center;
      padding: 10px 0;

      + li {
        border-top: 1px solid var(--edge);
      }

      span {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      code {
        color: var(--muted);
        font-size: 12px;
      }

      .ingredient-link {
        width: fit-content;
      }
    }
  }

  .source-callout {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
    background: var(--surface-quiet);

    svg {
      flex: none;
      color: var(--accent);
    }
  }

  @media (max-width: 560px) {
    .recipe-heading {
      grid-template-columns: 76px minmax(0, 1fr);
      gap: 16px;

      .item-heading-icon {
        width: 76px;
        height: 76px;
      }

      img {
        width: 56px;
        height: 56px;
      }
    }
  }
}
</style>
