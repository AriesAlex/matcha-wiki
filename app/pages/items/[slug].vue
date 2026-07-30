<template>
  <article
    v-if="item"
    class="item-page"
  >
    <NuxtLink
      class="back-link"
      to="/items"
    >
      <PhArrowLeft :size="18" />
      Все предметы
    </NuxtLink>

    <ItemOverview
      :item="item"
      :summary="purposeSummary"
    />

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Получение</p>
        <h2>Как получить</h2>
      </header>
      <ItemRelationList
        v-if="item.obtainedFrom.length"
        :relations="item.obtainedFrom"
      />
      <div
        v-if="recipes.length"
        class="creation"
      >
        <h3>Создать самому</h3>
        <div class="recipe-stack">
          <RecipeViewer
            v-for="recipe in recipes"
            :key="recipe.id"
            :recipe="recipe"
          />
        </div>
      </div>
      <p
        v-if="!item.obtainedFrom.length && !recipes.length"
        class="empty-note"
      >
        В данных пака не найден отдельный рецепт или гарантированный источник.
        Возможно, предмет выдаётся скрытой механикой или пока недоступен в выживании.
      </p>
    </section>

    <ItemCraftingPath :item="item" />

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Применение</p>
        <h2>Где используется</h2>
      </header>
      <ItemRelationList
        v-if="directUses.length"
        :relations="directUses"
      />
      <p
        v-else-if="!technicalUses.length"
        class="empty-note"
      >
        Прямого применения в рецептах и обменах пока не найдено.
      </p>
      <details
        v-if="technicalUses.length"
        class="ordinary-uses"
      >
        <summary>
          Осторожно: его можно потратить как «{{ ordinaryItemName }}»
        </summary>
        <p>
          Эти рецепты примут особый предмет вместо обычного и уничтожат его.
          Обычно выгоднее использовать простой «{{ ordinaryItemName }}».
        </p>
        <ItemRelationList :relations="playerSafeOrdinaryUses" />
      </details>
    </section>

    <ItemProperties
      v-if="item.effects.length || item.attributes.length"
      :item="item"
    />

    <ItemTechnicalDetails :item="item" />
  </article>
</template>

<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'

const route = useRoute()
const catalog = useWikiCatalog()
const itemSlug = computed(() => normalizeRouteParam(route.params.slug))
const item = computed(() => catalog.items.find(entry => entry.slug === itemSlug.value))

if (import.meta.server && !item.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Предмет не найден'
  })
}

onMounted(() => {
  if (!item.value) {
    showError({
      statusCode: 404,
      statusMessage: 'Предмет не найден'
    })
  }
})

const recipes = computed(() => item.value
  ? item.value.recipeIds
      .map(id => catalog.recipes.find(recipe => recipe.id === id))
      .filter(recipe => recipe !== undefined)
  : [])
const recipeUses = computed(() => (
  item.value ? resolveItemRecipeUses(catalog, item.value) : []
))
const directUses = computed(() => [
  ...(item.value?.usedIn ?? []),
  ...recipeUses.value.filter(relation => !relation.technical)
])
const technicalUses = computed(() => recipeUses.value.filter(relation => relation.technical))
const ordinaryItemName = computed(() => {
  const current = item.value
  if (!current) return 'обычный предмет'
  const glossary = catalog.ingredientGlossary[current.carrier]
  return glossary?.vanillaName ?? glossary?.name ?? 'обычный предмет'
})
const playerSafeOrdinaryUses = computed(() => technicalUses.value.map(relation => ({
  ...relation,
  description: `Рецепт примет этот предмет вместо «${ordinaryItemName.value}» и потратит его.`
})))
const purposeSummary = computed(() => (
  item.value ? getItemPurposeSummary(item.value) : ''
))

useSeoMeta({
  title: () => stripMinecraftFormatting(item.value?.title ?? 'Предмет'),
  description: () => {
    const current = item.value
    if (!current) return ''
    return `${stripMinecraftFormatting(current.title)} в Matcha Flavoured: зачем нужен, как получить, где использовать и какие свойства даёт.`
  }
})
</script>

<style scoped lang="scss">
.item-page {
  .recipe-stack {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .creation {
    margin-top: 34px;

    h3 {
      margin-bottom: 18px;
    }
  }

  .empty-note {
    max-width: 720px;
    margin: 0;
    color: var(--muted);
    line-height: 1.6;
  }

  .ordinary-uses {
    max-width: 880px;
    margin-top: 22px;

    summary {
      width: fit-content;
      min-height: 44px;
      display: flex;
      align-items: center;
      color: var(--ink);
      font-weight: 700;
      cursor: pointer;
    }

    > p {
      max-width: 720px;
      margin: 4px 0 14px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.55;
    }
  }
}
</style>
