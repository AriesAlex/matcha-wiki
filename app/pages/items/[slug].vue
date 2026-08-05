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

    <ItemProperties
      v-if="item.effects.length || item.enchantments.length || item.attributes.length"
      :item="item"
    />

    <section
      v-if="item.obtainedFrom.length || recipes.length"
      class="article-section"
    >
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
    </section>

    <section v-if="directUses.length" class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Применение</p>
        <h2>Где используется</h2>
      </header>
      <ItemRelationList
        :relations="directUses"
      />
    </section>

    <ItemCraftingPath :target="craftingTarget" />

    <ItemTechnicalDetails :item="item" />
  </article>
  <AcquisitionTargetPage
    v-else-if="acquisitionTarget"
    :target="acquisitionTarget"
  />
</template>

<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'

const route = useRoute()
const catalog = useWikiCatalog()
const itemSlug = computed(() => normalizeRouteParam(route.params.slug))
const item = computed(() => catalog.items.find(entry => entry.slug === itemSlug.value))
const acquisitionTarget = computed(() => acquisitionTargetForSlug(
  catalog.acquisition,
  itemSlug.value
))
const craftingTarget = computed(() => {
  if (!item.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Предмет не найден'
    })
  }
  return targetForItem(item.value, catalog)
})

if (import.meta.server && !item.value && !acquisitionTarget.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Предмет не найден'
  })
}

onMounted(() => {
  if (!item.value && !acquisitionTarget.value) {
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
  item.value ? playerFacingItemRecipeUses(catalog, item.value) : []
))
const directUses = computed(() => [
  ...(item.value?.usedIn ?? []),
  ...recipeUses.value
])
const purposeSummary = computed(() => (
  item.value ? getItemPurposeSummary(item.value, directUses.value) : ''
))

useWikiSeo({
  title: () => stripMinecraftFormatting(
    item.value?.title ?? acquisitionTarget.value?.title ?? 'Предмет'
  ),
  description: () => {
    const current = item.value
    const title = current?.title ?? acquisitionTarget.value?.title
    if (!title) return ''
    return `${stripMinecraftFormatting(title)} в Matcha Flavoured: зачем нужен, как получить и где использовать.`
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

}
</style>
