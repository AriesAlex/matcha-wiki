<template>
  <article v-if="item" class="item-page">
    <NuxtLink class="back-link" to="/items">
      <PhArrowLeft :size="18" />
      Все предметы
    </NuxtLink>

    <header class="item-heading">
      <span class="item-heading-icon">
        <img
          v-if="item.icon"
          :src="useAssetPath(item.icon)"
          :alt="stripMinecraftFormatting(item.title)"
          width="80"
          height="80"
        >
      </span>
      <div>
        <p class="eyebrow">{{ item.category }}</p>
        <h1><MinecraftText :text="item.title" /></h1>
        <code>{{ item.model ?? item.carrier }}</code>
      </div>
    </header>

    <div class="item-overview">
      <section class="minecraft-tooltip">
        <strong><MinecraftText :text="item.name" /></strong>
        <p
          v-for="line in item.lore"
          :key="line"
        >
          <MinecraftText :text="line" />
        </p>
        <small v-if="!item.lore.length">Без отдельной строки описания в игре</small>
      </section>

      <dl class="item-meta">
        <div>
          <dt>Техническая основа</dt>
          <dd><code>{{ item.carrier }}</code></dd>
        </div>
        <div>
          <dt>Модель ресурспака</dt>
          <dd>
            <code v-if="item.model">{{ item.model }}</code>
            <span v-else>Нет — вариант задаётся components</span>
          </dd>
        </div>
        <div>
          <dt>Пользовательский вариант</dt>
          <dd>{{ item.isCustom ? 'Да, определяется components' : 'Нет' }}</dd>
        </div>
        <div>
          <dt>Источников в паке</dt>
          <dd>{{ item.sources.length }}</dd>
        </div>
      </dl>
    </div>

    <section class="article-section purpose">
      <header class="section-heading">
        <p class="eyebrow">Назначение</p>
        <h2>Зачем нужен предмет</h2>
      </header>
      <p class="purpose-summary">{{ purposeSummary }}</p>
      <p v-if="item.guide?.note" class="purpose-note">
        {{ item.guide.note }}
      </p>
    </section>

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
      <div v-if="recipes.length" class="creation">
        <h3>Создание</h3>
        <div class="recipe-stack">
          <RecipeViewer
            v-for="recipe in recipes"
            :key="recipe.id"
            :recipe="recipe"
          />
        </div>
      </div>
    </section>

    <section
      v-if="directUses.length || technicalUses.length"
      class="article-section"
    >
      <header class="section-heading">
        <p class="eyebrow">Применение</p>
        <h2>Где используется</h2>
      </header>
      <ItemRelationList
        v-if="directUses.length"
        :relations="directUses"
      />
      <details
        v-if="technicalUses.length"
        class="technical-uses"
        :open="technicalUses.length <= 4"
      >
        <summary>
          Рецепты, принимающие техническую основу
          <span>{{ technicalUses.length }}</span>
        </summary>
        <p>
          Эти рецепты проверяют ванильный тип предмета, а не его уникальное
          название или модель. Использование уничтожит особый вариант как
          обычный ингредиент.
        </p>
        <ItemRelationList :relations="technicalUses" />
      </details>
    </section>

    <section
      v-if="item.effects.length || item.attributes.length"
      class="article-section"
    >
      <header class="section-heading">
        <p class="eyebrow">Игровые данные</p>
        <h2>Эффекты и параметры</h2>
      </header>
      <dl class="effect-list">
        <div
          v-for="effect in item.effects"
          :key="`${effect.id}:${effect.level}:${effect.durationSeconds}`"
        >
          <dt><PhSparkle :size="18" /> {{ effect.name }} {{ effect.level > 1 ? effect.level : '' }}</dt>
          <dd>{{ formatDuration(effect.durationSeconds) }}</dd>
        </div>
        <div
          v-for="attribute in item.attributes"
          :key="`${attribute.id}:${attribute.slot}`"
        >
          <dt>{{ attribute.name }}</dt>
          <dd>{{ attribute.amount }} · {{ attribute.operation }}</dd>
        </div>
      </dl>
    </section>

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Проверяемость</p>
        <h2>Откуда взялись сведения</h2>
      </header>
      <ul class="source-list">
        <li
          v-for="source in item.sources"
          :key="`${source.kind}:${source.path}`"
        >
          <PhGitBranch :size="18" />
          <span>
            <strong>{{ source.label }}</strong>
            <code>{{ source.path }}</code>
          </span>
        </li>
      </ul>
      <details class="technical-details">
        <summary><PhCode :size="18" /> Все components</summary>
        <pre><code>{{ JSON.stringify(item.components, null, 2) }}</code></pre>
      </details>
    </section>
  </article>
</template>

<script setup lang="ts">
import { PhArrowLeft, PhCode, PhGitBranch, PhSparkle } from '@phosphor-icons/vue'

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
const purposeSummary = computed(() => {
  const current = item.value
  if (!current) return ''
  if (current.guide?.summary) return current.guide.summary

  const tradeCount = current.usedIn.filter(relation => relation.kind === 'trade').length
  const recipeCount = current.recipeUses.filter(use => !use.technical).length
  if (tradeCount && recipeCount) {
    return `Предмет используется в ${formatRelationCount(tradeCount, 'сделке', 'сделках')} с жителями и ${formatRelationCount(recipeCount, 'рецепте', 'рецептах')}.`
  }
  if (tradeCount) {
    return `Предмет используется в ${formatRelationCount(tradeCount, 'сделке', 'сделках')} с жителями.`
  }
  if (recipeCount) {
    return `Предмет используется в ${formatRelationCount(recipeCount, 'рецепте', 'рецептах')}.`
  }
  const technicalRecipeCount = current.recipeUses.filter(use => use.technical).length
  if (technicalRecipeCount) {
    return `Уникального применения не найдено, но техническая основа предмета подходит для ${formatRelationCount(technicalRecipeCount, 'рецепта', 'рецептов')}. Такие рецепты могут уничтожить особый вариант как обычный ингредиент.`
  }
  if (current.effects.length || current.attributes.length) {
    return 'Предмет даёт игровые эффекты или меняет характеристики. Точные параметры перечислены ниже.'
  }
  return 'В рецептах и торговле прямое применение предмета не обнаружено. Известные источники и игровые параметры перечислены ниже.'
})

function formatRelationCount(count: number, singular: string, plural: string): string {
  const usesSingular = count % 10 === 1 && count % 100 !== 11
  return `${count} ${usesSingular ? singular : plural}`
}

useSeoMeta({
  title: () => stripMinecraftFormatting(item.value?.title ?? 'Предмет'),
  description: () => {
    const current = item.value
    if (!current) return ''
    return `${stripMinecraftFormatting(current.title)} в Matcha Flavoured: получение, рецепты, эффекты и техническая основа ${current.carrier}.`
  }
})
</script>

<style scoped lang="scss">
.item-page {
  .item-heading,
  .item-overview {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 28px;
  }

  .item-heading {
    align-items: center;

    h1 {
      font-size: clamp(2.2rem, 5vw, 4.2rem);
    }

    code {
      display: inline-block;
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
    }
  }

  .item-heading-icon {
    width: 112px;
    height: 112px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-quiet);

    img {
      width: 80px;
      height: 80px;
      object-fit: contain;
      image-rendering: pixelated;
    }
  }

  .item-overview {
    grid-template-columns: minmax(260px, 0.8fr) minmax(300px, 1.2fr);
    align-items: start;
    margin-top: 46px;
  }

  .minecraft-tooltip {
    min-height: 132px;
    padding: 16px;
    color: #f8f8f8;
    background: #100010;
    border: 2px solid #2a0a55;
    box-shadow: inset 0 0 0 2px #10002d;
    font-family: 'Cascadia Mono', monospace;
    text-shadow: 2px 2px 0 #2d2d2d;

    strong {
      color: #fff;
    }

    p,
    small {
      display: block;
      margin: 4px 0 0;
      color: #bfbfbf;
      font-size: 13px;
    }
  }

  .item-meta {
    margin: 0;

    div {
      display: grid;
      grid-template-columns: minmax(130px, 0.7fr) minmax(0, 1fr);
      gap: 16px;
      padding: 10px 0;

      + div {
        border-top: 1px solid var(--edge);
      }
    }

    dt {
      color: var(--muted);
      font-size: 13px;
    }

    dd {
      margin: 0;
      font-size: 14px;
    }
  }

  .recipe-stack {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .purpose {
    max-width: 880px;
  }

  .purpose-summary {
    max-width: 760px;
    margin: 0;
    font-size: 18px;
    line-height: 1.65;
  }

  .purpose-note {
    max-width: 760px;
    margin: 20px 0 0;
    padding: 14px 16px;
    color: var(--muted);
    background: var(--surface-quiet);
    border-left: 3px solid var(--accent);
    line-height: 1.55;
  }

  .creation {
    margin-top: 34px;

    h3 {
      margin-bottom: 18px;
    }
  }

  .technical-uses {
    max-width: 880px;
    margin-top: 22px;

    summary {
      width: fit-content;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      font-weight: 700;
      cursor: pointer;

      span {
        color: var(--muted);
        font-family: 'Cascadia Mono', monospace;
        font-size: 12px;
      }
    }

    > p {
      max-width: 720px;
      margin: 4px 0 14px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.55;
    }
  }

  .effect-list {
    max-width: 700px;
    margin: 0;

    div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 11px 0;

      + div {
        border-top: 1px solid var(--edge);
      }
    }

    dt {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
    }

    dd {
      margin: 0;
      color: var(--muted);
    }
  }

  .source-list {
    max-width: 850px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 10px;
      padding: 11px 0;

      + li {
        border-top: 1px solid var(--edge);
      }

      svg {
        margin-top: 3px;
        color: var(--accent);
      }

      span {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      code {
        margin-top: 2px;
        color: var(--muted);
        font-size: 12px;
      }
    }
  }

  @media (max-width: 700px) {
    .item-heading {
      grid-template-columns: 82px minmax(0, 1fr);
      gap: 18px;
    }

    .item-heading-icon {
      width: 82px;
      height: 82px;

      img {
        width: 62px;
        height: 62px;
      }
    }

    .item-overview {
      display: flex;
      flex-direction: column;

      > * {
        width: 100%;
      }
    }
  }
}
</style>
