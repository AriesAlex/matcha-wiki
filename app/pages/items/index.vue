<template>
  <article class="index-page">
    <header class="page-heading">
      <p class="eyebrow">Справочник</p>
      <h1>Предметы</h1>
      <p>
        Еда, инструменты, реликвии и другие вещи из Matcha. Откройте предмет,
        чтобы узнать, зачем он нужен, где его искать и как изготовить.
      </p>
    </header>

    <div class="catalog-controls">
      <label class="catalog-search">
        <PhMagnifyingGlass :size="20" />
        <span class="visually-hidden">Поиск предмета</span>
        <input
          v-model="query"
          name="item-search"
          type="search"
          placeholder="Название предмета…"
          autocomplete="off"
          spellcheck="false"
        >
      </label>
      <label>
        <span class="visually-hidden">Категория предметов</span>
        <select
          v-model="category"
          name="item-category"
        >
          <option
            v-for="option in categories"
            :key="option"
          >
            {{ option }}
          </option>
        </select>
      </label>
      <p aria-live="polite">Показано: {{ filteredItems.length }}</p>
    </div>

    <ul class="item-index">
      <li
        v-for="item in filteredItems"
        :key="item.slug"
      >
        <NuxtLink :to="`/items/${item.slug}`">
          <span class="index-icon">
            <img
              v-if="item.icon"
              :src="useAssetPath(item.icon)"
              alt=""
              width="40"
              height="40"
              loading="lazy"
              decoding="async"
            >
          </span>
          <span>
            <strong><MinecraftText :text="item.title" /></strong>
            <small>{{ item.category }}</small>
          </span>
          <PhArrowRight
            class="arrow"
            :size="20"
            aria-hidden="true"
          />
        </NuxtLink>
      </li>
    </ul>

    <div v-if="!filteredItems.length" class="catalog-empty">
      <img
        :src="useAssetPath('/generated/ui/pack.png')"
        alt=""
        width="88"
        height="88"
      >
      <p>Ничего не найдено. Сбросьте категорию или проверьте название предмета.</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { PhArrowRight, PhMagnifyingGlass } from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const catalog = useWikiCatalog()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const category = ref(typeof route.query.category === 'string' ? route.query.category : 'Все')

const categories = computed(() => [
  'Все',
  ...new Set(catalog.items.map(item => item.category))
])

const filteredItems = computed(() => {
  const needle = query.value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim()

  return catalog.items.filter((item) => {
    if (category.value !== 'Все' && item.category !== category.value) {
      return false
    }
    if (!needle) {
      return true
    }
    const haystack = `${item.title} ${item.name} ${item.id} ${item.model ?? ''} ${item.carrier} ${item.aliases.join(' ')}`
      .toLocaleLowerCase('ru-RU')
      .replaceAll('ё', 'е')
    return haystack.includes(needle)
  })
})

watchDebounced(
  [query, category],
  ([nextQuery, nextCategory]) => {
    void router.replace({
      query: {
        ...route.query,
        q: nextQuery.trim() || undefined,
        category: nextCategory === 'Все' ? undefined : nextCategory
      }
    })
  },
  { debounce: 180 }
)

useWikiSeo({
  title: 'Предметы',
  description: `Каталог ${catalog.stats.items} предметов Matcha Flavoured: получение, применение, рецепты и свойства.`
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

  .item-index {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      content-visibility: auto;
      contain-intrinsic-size: 68px;

      + li {
        border-top: 1px solid var(--edge);
      }
    }

    a {
      min-height: 68px;
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr) auto;
      align-items: center;
      gap: 14px;
      padding: 8px;
      color: var(--ink);
      text-decoration: none;

      &:hover {
        color: var(--ink);
        background: var(--surface-quiet);

        .arrow {
          color: var(--accent);
          transform: translateX(3px);
        }
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

      strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      small {
        color: var(--muted);
      }
    }

    .arrow {
      color: var(--muted);
      transition:
        color 120ms ease,
        transform 120ms ease;
    }
  }

  .catalog-empty {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 36px;
    background: var(--surface-quiet);

    img {
      image-rendering: pixelated;
    }

    p {
      max-width: 520px;
      color: var(--muted);
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

    .item-index {
      a {
        grid-template-columns: 48px minmax(0, 1fr) auto;
      }
    }
  }
}
</style>
