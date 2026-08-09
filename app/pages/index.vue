<template>
  <div class="home-page">
    <section class="home-intro">
      <header class="home-heading">
        <img
          class="home-mark"
          :src="useAssetPath('/generated/ui/pack.png')"
          alt="Эмблема Matcha Flavoured"
          width="112"
          height="112"
        >
        <div>
          <h1>
            <span>Matcha Flavoured</span>
            на русском
          </h1>
          <p class="edition">
            Редакция {{ catalog.pack.version }} · Minecraft Java {{ catalog.pack.minecraft }}
          </p>
        </div>
      </header>

      <p class="lead">
        Ручной перевод с исправлениями и вики, которая ведёт от первого костра
        до эндгейма.
      </p>

      <div class="home-actions">
        <a class="home-download" :href="downloadUrl">
          <PhDownloadSimple :size="23" weight="bold" aria-hidden="true" />
          Скачать русскую Matcha
        </a>
        <NuxtLink to="/fork">Что переведено и исправлено</NuxtLink>
      </div>

      <button
        class="home-search"
        type="button"
        @click="openSearch"
      >
        <PhMagnifyingGlass :size="22" weight="bold" />
        <span>Предмет, рецепт или достижение</span>
        <kbd>Ctrl K</kbd>
      </button>
    </section>

    <section class="starter-section">
      <header class="section-heading">
        <h2>Начните не с камня</h2>
        <p>
          Каменных инструментов здесь нет. Первый путь Matcha начинается с огня,
          сухой травы и саманной печи.
        </p>
      </header>

      <ol class="starter-trail">
        <li
          v-for="step in starterTrail"
          :key="step.id"
        >
          <ItemSlot :stack="step.icon" />
          <span>{{ step.label }}</span>
        </li>
      </ol>

      <nav class="starter-links">
        <NuxtLink class="text-link" to="/guides/first-day">
          Первые 20–40 минут <PhArrowRight :size="18" />
        </NuxtLink>
        <NuxtLink class="text-link" to="/progression">
          Весь путь игры <PhArrowRight :size="18" />
        </NuxtLink>
      </nav>
    </section>

    <section class="reference-section">
      <header class="section-heading">
        <h2>Найти в игре</h2>
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

      <nav class="reference-links">
        <NuxtLink to="/items">Все предметы</NuxtLink>
        <NuxtLink to="/recipes">Все рецепты</NuxtLink>
        <NuxtLink to="/traders">Торговцы</NuxtLink>
      </nav>
    </section>
  </div>
</template>

<script setup lang="ts">
import { PhArrowRight, PhDownloadSimple, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { releaseDownloadUrl } from '~/utils/siteMeta'

const catalog = useWikiCatalog()
const { open: openSearch } = useSearchDialog()
const downloadUrl = releaseDownloadUrl(
  catalog.pack.artifactName,
  catalog.pack.version
)

const starterTrailIds = [
  { id: 'main:tutorial/light_campfire', label: 'Костёр' },
  { id: 'main:tutorial/obtain_dry_grass', label: 'Сухая трава' },
  { id: 'main:tutorial/obtain_kiln', label: 'Саманная печь' },
  { id: 'main:tutorial/obtain_copper', label: 'Медь' },
  { id: 'main:tutorial/obtain_blast_furnace', label: 'Плавильная печь' }
]

const starterTrail = computed(() => starterTrailIds.flatMap((step) => {
  const advancement = catalog.advancements.find(entry => entry.id === step.id)
  return advancement ? [{ ...step, icon: advancement.icon }] : []
}))

const categoryCounts = computed(() => {
  const counts = new Map<string, number>()
  catalog.items.forEach((item) => {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  })
  return [...counts.entries()].sort((left, right) => right[1] - left[1])
})

useWikiSeo({
  title: 'Matcha Flavoured на русском: вики и скачивание',
  description: 'Скачайте русскую версию Matcha Flavoured или найдите рецепты, предметы, механики и подробное прохождение.'
})
</script>

<style scoped lang="scss">
.home-page {
  .home-intro {
    max-width: 820px;
  }

  .home-heading {
    display: flex;
    gap: 24px;
    align-items: center;

    h1 span {
      display: block;
    }

    .edition {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 14px;
      font-weight: 650;
    }
  }

  .home-mark {
    width: 112px;
    height: 112px;
    flex: none;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .lead {
    max-width: 700px;
    margin: 26px 0 22px;
    color: var(--muted);
    font-size: 20px;
  }

  .home-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 20px;

    a {
      min-height: 52px;
      display: inline-flex;
      align-items: center;
      font-weight: 800;
    }

    .home-download {
      gap: 9px;
      padding: 0 20px;
      color: var(--surface);
      background: var(--accent);
      box-shadow: 0 4px 0 #285a2d;
      font-size: 17px;
      text-decoration: none;
      transition:
        background-color 120ms ease,
        box-shadow 120ms ease,
        transform 120ms ease;

      &:hover {
        color: var(--surface);
        background: var(--accent-bright);
      }

      &:active {
        box-shadow: 0 1px 0 #285a2d;
        transform: translateY(3px);
      }
    }
  }

  .home-search {
    width: min(100%, 700px);
    min-height: 56px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    padding: 0 14px 0 18px;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--edge);
    text-align: left;
    transition:
      background-color 140ms ease,
      border-color 140ms ease;

    &:hover {
      background: var(--surface-quiet);
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

  .starter-section,
  .reference-section {
    margin-top: 80px;
  }

  .starter-section {
    max-width: 900px;

    .section-heading {
      max-width: 680px;

      p {
        margin: 14px 0 0;
        color: var(--muted);
        font-size: 17px;
      }
    }
  }

  .starter-trail {
    max-width: 760px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    margin: 30px 0 24px;
    padding: 0;
    list-style: none;

    li {
      position: relative;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 9px;
      align-items: center;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      line-height: 1.25;
      text-align: center;

      &:not(:last-child)::after {
        content: '›';
        position: absolute;
        top: 9px;
        right: -8px;
        color: var(--muted);
        font-size: 24px;
        font-weight: 400;
        line-height: 1;
      }
    }
  }

  .starter-links,
  .reference-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 28px;
  }

  .text-link {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-weight: 800;
  }

  .reference-section {
    max-width: 760px;
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

  .reference-links {
    margin-top: 24px;

    a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      font-weight: 800;
    }
  }

  @media (max-width: 620px) {
    .home-heading {
      gap: 15px;
      align-items: flex-start;

      h1 {
        font-size: clamp(2.25rem, 10vw, 3.1rem);
      }

      .edition {
        margin-top: 7px;
        font-size: 12px;
      }
    }

    .home-mark {
      width: 68px;
      height: 68px;
    }

    .lead {
      margin-top: 22px;
      font-size: 17px;
    }

    .home-actions .home-download {
      min-height: 56px;
    }

    .home-search kbd {
      display: none;
    }

    .starter-section,
    .reference-section {
      margin-top: 64px;
    }

    .starter-trail {
      gap: 4px;

      li {
        gap: 7px;
        font-size: 11px;

        &:not(:last-child)::after {
          right: -4px;
        }
      }
    }

    .category-index {
      gap-inline: 18px;

      a {
        font-size: 14px;
      }
    }
  }

  @media (max-width: 350px) {
    .home-heading {
      display: block;

      .home-mark {
        margin-bottom: 14px;
      }
    }

    .starter-trail li {
      font-size: 10px;
    }

    .category-index {
      grid-template-columns: 1fr;
    }
  }
}
</style>
