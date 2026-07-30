<template>
  <article
    v-if="recipe"
    class="recipe-page"
  >
    <NuxtLink
      class="back-link"
      :to="backLink"
    >
      <PhArrowLeft :size="18" />
      {{ backLabel }}
    </NuxtLink>

    <header class="recipe-heading">
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
      <div>
        <p class="eyebrow">Способ изготовления</p>
        <h1>
          <MinecraftText :text="resultTitle" />
        </h1>
        <p>{{ recipe.station }} · точная раскладка и нужное количество ресурсов.</p>
      </div>
    </header>

    <RecipeViewer :recipe="recipe" />

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Список покупок</p>
        <h2>Что подготовить</h2>
      </header>
      <ul class="ingredient-list">
        <li
          v-for="entry in ingredientEntries"
          :key="entry.key"
        >
          <ItemStackReference
            :item="entry.item"
            :ingredient="entry.item ? undefined : entry.ingredient"
            :count="entry.count"
            :label="entry.item?.title ?? entry.ingredient.label"
            :secondary="entry.explanation || secondaryRoleLabel(entry.role)"
          />
        </li>
      </ul>
    </section>

    <details class="verification">
      <summary>
        <PhGitBranch :size="18" />
        Как проверен этот способ
      </summary>
      <p>
        Схема прочитана прямо из файла игрового пака:
        <code>{{ recipe.sourcePath }}</code>
      </p>
    </details>
  </article>
</template>

<script setup lang="ts">
import { PhArrowLeft, PhGitBranch } from '@phosphor-icons/vue'
import type { RecipeRequirementRole } from '~/types/wiki'

const route = useRoute()
const catalog = useWikiCatalog()
const recipeId = computed(() => (
  `${normalizeRouteParam(route.params.namespace)}:${normalizeRouteParam(route.params.path)}`
))
const recipe = computed(() => catalog.recipes.find(entry => entry.id === recipeId.value))

if (import.meta.server && !recipe.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Способ изготовления не найден'
  })
}

onMounted(() => {
  if (!recipe.value) {
    showError({
      statusCode: 404,
      statusMessage: 'Способ изготовления не найден'
    })
  }
})

const resultItem = computed(() => {
  const result = recipe.value?.result
  return result ? resolveStackItem(catalog.items, result) : undefined
})
const resultTitle = computed(() => (
  resultItem.value?.title
  ?? recipe.value?.result?.name
  ?? 'Неизвестный результат'
))
const backLink = computed(() => (
  resultItem.value ? `/items/${resultItem.value.slug}` : '/recipes'
))
const backLabel = computed(() => (
  resultItem.value
    ? `К предмету «${stripMinecraftFormatting(resultItem.value.title)}»`
    : 'Ко всем способам изготовления'
))
const ingredientEntries = computed(() => (
  (recipe.value?.requirements ?? []).map(requirement => ({
    key: requirement.id,
    ingredient: requirement.ingredient,
    count: requirement.count,
    role: requirement.role,
    item: resolveIngredientItem(catalog.items, requirement.ingredient),
    explanation: ingredientExplanation(requirement.ingredient)
  }))
))

function ingredientExplanation(
  ingredient: NonNullable<typeof recipe.value>['ingredients'][number]
): string {
  const entries = ingredient.ids
    .map(id => catalog.ingredientGlossary[id])
    .filter(entry => entry !== undefined)
  const renamed = entries
    .filter(entry => entry.vanillaName && entry.vanillaName !== entry.name)
    .map(entry => (
      `${stripMinecraftFormatting(entry.name)} в обычном Minecraft выглядит как ${entry.vanillaName}`
    ))
  const hints = [...new Set(entries
    .map(entry => entry.obtainHint)
    .filter((hint): hint is string => Boolean(hint)))]

  return [...renamed, ...hints].join('. ')
}

function secondaryRoleLabel(role: RecipeRequirementRole): string {
  return {
    ingredient: '',
    template: 'Кузнечный шаблон',
    base: 'Основа',
    addition: 'Добавка'
  }[role]
}

useSeoMeta({
  title: () => `Как сделать: ${stripMinecraftFormatting(resultTitle.value)}`,
  description: () => {
    const current = recipe.value
    if (!current) return ''
    const ingredients = current.requirements
      .map(requirement => requirement.ingredient.label)
      .join(', ')
    return `${current.station}: как сделать ${stripMinecraftFormatting(resultTitle.value)} из ${ingredients}.`
  }
})
</script>

<style scoped lang="scss">
.recipe-page {
  .recipe-heading {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: center;
    gap: 22px;
    max-width: 900px;
    margin-bottom: 42px;

    h1 {
      font-size: clamp(2rem, 5vw, 4rem);
    }

    p:last-child {
      margin: 10px 0 0;
      color: var(--muted);
    }
  }

  .ingredient-list {
    max-width: 760px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      padding: 10px 0;

      + li {
        border-top: 1px solid var(--edge);
      }
    }
  }

  .verification {
    max-width: 760px;
    margin-top: 64px;
    color: var(--muted);

    summary {
      width: fit-content;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--ink);
      font-weight: 700;
      cursor: pointer;
    }

    p {
      margin: 8px 0 0;
      padding: 14px;
      background: var(--surface-quiet);
      font-size: 13px;
    }

    code {
      display: block;
      margin-top: 5px;
    }
  }
}

@media (max-width: 560px) {
  .recipe-page {
    .recipe-heading {
      grid-template-columns: 64px minmax(0, 1fr);
      gap: 14px;
    }

    .back-link {
      align-items: flex-start;
    }
  }
}
</style>
