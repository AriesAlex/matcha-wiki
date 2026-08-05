<template>
  <div class="home-page">
    <section class="home-intro">
      <div>
        <p class="eyebrow">Проверено по исходникам пака</p>
        <h1>Matcha Flavoured без догадок</h1>
        <p class="lead">
          Русская энциклопедия актуальной редакции: реальные рецепты,
          способы добычи, изменённые механики и маршрут от первого костра до пост-Энда.
        </p>
        <button
          class="home-search"
          type="button"
          @click="openSearch"
        >
          <PhMagnifyingGlass :size="22" weight="bold" />
          <span>Найти предмет, рецепт или достижение</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>
      <aside class="field-note">
        <img
          :src="useAssetPath('/generated/ui/pack.png')"
          alt="Эмблема Matcha Flavoured"
          width="112"
          height="112"
        >
        <p>
          Обычная ванильная интуиция здесь часто мешает: каменных инструментов нет,
          голод заменён лечением, а смерть забирает часть максимального здоровья.
        </p>
      </aside>
    </section>

    <section class="task-section">
      <header class="section-heading">
        <p class="eyebrow">Выберите текущую задачу</p>
        <h2>Куда идти прямо сейчас</h2>
      </header>
      <nav class="task-list" aria-label="Основные сценарии">
        <NuxtLink to="/start">
          <PhBookOpenText :size="28" />
          <span>
            <strong>Я только установил пак</strong>
            <small>Проверить установку, пережить первые минуты и получить медь.</small>
          </span>
          <PhArrowRight :size="20" />
        </NuxtLink>
        <NuxtLink to="/progression">
          <PhCompass :size="28" />
          <span>
            <strong>Хочу понять всю прогрессию</strong>
            <small>Металлургия, сердца, Ад, Энд и возобновляемый эндгейм.</small>
          </span>
          <PhArrowRight :size="20" />
        </NuxtLink>
        <NuxtLink to="/fork">
          <PhWrench :size="28" />
          <span>
            <strong>Попробовать форк ArieX</strong>
            <small>Ручная локализация, проверенные исправления, установка и один ZIP.</small>
          </span>
          <PhArrowRight :size="20" />
        </NuxtLink>
      </nav>
    </section>

    <section class="reference-section">
      <div>
        <header class="section-heading">
          <p class="eyebrow">Быстрый справочник</p>
          <h2>Смотреть по типу</h2>
        </header>
        <div class="category-index">
          <NuxtLink
            v-for="[category, count] in categoryCounts"
            :key="category"
            :to="{ path: '/items', query: { category } }"
          >
            <span>{{ category }}</span>
            <small>{{ count }}</small>
          </NuxtLink>
        </div>
        <p class="inline-counts">
          В каталоге: <NuxtLink to="/items">{{ catalog.stats.items }} предметов</NuxtLink>,
          <NuxtLink to="/recipes">{{ catalog.stats.recipes }} рецептов</NuxtLink> и
          <NuxtLink to="/progression">{{ catalog.stats.advancements }} видимых достижений</NuxtLink>.
        </p>
      </div>

      <aside class="version-note">
        <p class="eyebrow">Редакция вики</p>
        <h2>Актуальный проверенный срез</h2>
        <p>
          Форк ArieX сохраняет баланс оригинала, добавляет ручной русский перевод
          и только проверенные технические исправления.
        </p>
        <NuxtLink to="/fork">О редакции ArieX</NuxtLink>
      </aside>
    </section>

    <section class="milestone-section">
      <header class="section-heading">
        <p class="eyebrow">Первые ориентиры</p>
        <h2>Встроенный путь обучения</h2>
      </header>
      <ol class="milestone-list">
        <li
          v-for="milestone in milestones"
          :key="milestone.id"
        >
          <ItemSlot :stack="milestone.icon" />
          <div>
            <strong><MinecraftText :text="milestone.title" /></strong>
            <p><MinecraftText :text="milestone.description" /></p>
          </div>
        </li>
      </ol>
      <NuxtLink class="text-link" to="/progression">
        Открыть карту прохождения <PhArrowRight :size="18" />
      </NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { PhArrowRight, PhBookOpenText, PhCompass, PhMagnifyingGlass, PhWrench } from '@phosphor-icons/vue'

const catalog = useWikiCatalog()
const { open: openSearch } = useSearchDialog()

const categoryCounts = computed(() => {
  const counts = new Map<string, number>()
  catalog.items.forEach((item) => {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  })
  return [...counts.entries()].sort((left, right) => right[1] - left[1])
})

const milestones = computed(() => catalog.advancements
  .filter(advancement => advancement.section === 'tutorial')
  .slice(0, 6))

useWikiSeo({
  title: 'Русская энциклопедия Matcha Flavoured',
  description: 'Рецепты, предметы, механики и подробное прохождение актуальной редакции Matcha Flavoured.'
})
</script>

<style scoped lang="scss">
.home-page {
  .home-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 64px;
    align-items: end;

    .lead {
      max-width: 760px;
      margin: 24px 0 30px;
      color: var(--muted);
      font-size: 20px;
    }
  }

  .home-search {
    width: min(100%, 660px);
    min-height: 56px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    padding: 0 14px 0 18px;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--edge);
    box-shadow: 0 10px 30px var(--shadow);
    text-align: left;

    &:hover {
      border-color: var(--accent);
    }

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    kbd {
      padding: 3px 7px;
      color: var(--muted);
      background: var(--surface-quiet);
      font-size: 11px;
    }
  }

  .field-note {
    padding: 20px;
    background: var(--surface-quiet);

    img {
      width: 112px;
      height: 112px;
      display: block;
      margin: -54px 0 10px auto;
      object-fit: contain;
      image-rendering: pixelated;
    }

    p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
  }

  .task-section,
  .reference-section,
  .milestone-section {
    margin-top: 88px;
  }

  .task-list {
    display: flex;
    flex-direction: column;

    a {
      min-height: 94px;
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr) 20px;
      align-items: center;
      gap: 18px;
      padding: 18px 10px;
      color: inherit;
      text-decoration: none;

      + a {
        border-top: 1px solid var(--edge);
      }

      > svg:first-child {
        color: var(--accent);
      }

      &:hover {
        color: inherit;
        background: var(--surface-quiet);
      }

      span {
        display: flex;
        flex-direction: column;
      }

      strong {
        font-size: 18px;
      }

      small {
        margin-top: 4px;
        color: var(--muted);
        font-size: 14px;
      }
    }
  }

  .reference-section {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 64px;
    align-items: start;
  }

  .category-index {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 28px;

    a {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0;
      color: var(--ink);
      text-decoration: none;

      &:hover {
        color: var(--accent);
      }

      small {
        color: var(--muted);
        font-variant-numeric: tabular-nums;
      }
    }
  }

  .inline-counts {
    margin: 24px 0 0;
    color: var(--muted);
    font-size: 14px;
  }

  .version-note {
    padding: 24px;
    background: var(--surface-quiet);

    h2 {
      font-size: 30px;
    }

    p:not(.eyebrow) {
      color: var(--muted);
      font-size: 14px;
    }

    a {
      font-weight: 800;
    }
  }

  .milestone-list {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr);
      gap: 15px;
      padding: 16px 0;

      + li {
        border-top: 1px solid var(--edge);
      }

      strong {
        font-size: 16px;
      }

      p {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 14px;
      }
    }
  }

  .text-link {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 18px;
    font-weight: 800;
  }

  @media (max-width: 780px) {
    .home-intro,
    .reference-section {
      display: flex;
      flex-direction: column;
      gap: 40px;
      align-items: stretch;
    }

    .field-note {
      margin-top: 20px;

      img {
        float: right;
        margin: -52px 0 8px 14px;
      }
    }

    .reference-section .version-note {
      width: min(100%, 420px);
    }
  }

  @media (max-width: 540px) {
    .home-intro .lead {
      font-size: 17px;
    }

    .home-search {
      kbd {
        display: none;
      }
    }

    .task-section,
    .reference-section,
    .milestone-section {
      margin-top: 68px;
    }

    .task-list a {
      grid-template-columns: 28px minmax(0, 1fr);

      > svg:last-child {
        display: none;
      }
    }

    .category-index {
      grid-template-columns: 1fr;
    }
  }
}
</style>
