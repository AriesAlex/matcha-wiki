<template>
  <article class="progression-page">
    <header class="page-heading">
      <p class="eyebrow">Рекомендуемый маршрут</p>
      <h1>Путь прохождения</h1>
      <p>
        Matcha перестраивает привычные зависимости, поэтому путь ниже опирается
        одновременно на recipes, advancements, loot tables, функции и реальные стопперы.
      </p>
    </header>

    <ol class="progression-path" role="list">
      <li
        v-for="stage in stages"
        :key="stage.title"
      >
        <component :is="stage.icon" :size="30" weight="duotone" />
        <div>
          <h2>{{ stage.title }}</h2>
          <p>{{ stage.summary }}</p>
          <ul>
            <li v-for="goal in stage.goals" :key="goal">{{ goal }}</li>
          </ul>
          <NuxtLink :to="stage.to">
            Открыть гайд <PhArrowRight :size="18" />
          </NuxtLink>
        </div>
      </li>
    </ol>

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Внутриигровые подсказки</p>
        <h2>Видимые достижения обучения</h2>
        <p>
          Это полный машинный список из пака. Редакционные гайды выше объясняют
          оптимальный порядок и места, где дерево достижений не отражает реальный стоппер.
        </p>
      </header>
      <ul class="advancement-list" role="list">
        <li
          v-for="advancement in tutorial"
          :id="advancement.slug"
          :key="advancement.id"
        >
          <ItemSlot :stack="advancement.icon" />
          <div class="advancement-copy">
            <strong><MinecraftText :text="advancement.title" /></strong>

            <details
              v-if="advancement.guide?.spoiler"
              class="advancement-spoiler"
            >
              <summary>
                <MinecraftText :text="advancement.description" />
                <span>раскрыть условие</span>
              </summary>
              <div class="advancement-guide">
                <p v-if="advancement.guide.note">{{ advancement.guide.note }}</p>
                <p>
                  <b>Точное условие:</b>
                  {{ advancement.guide.exactCondition }}
                </p>
                <ul v-if="advancement.guide.entries.length">
                  <li
                    v-for="entry in advancement.guide.entries"
                    :key="entry.to"
                  >
                    <NuxtLink :to="entry.to">{{ entry.label }}</NuxtLink>
                  </li>
                </ul>
              </div>
            </details>

            <template v-else>
              <p class="advancement-description">
                <NuxtLink
                  v-if="advancement.guide?.link"
                  :to="advancement.guide.link.to"
                >
                  <MinecraftText :text="advancement.description" />
                </NuxtLink>
                <template v-else>
                  <MinecraftText :text="advancement.description" />
                </template>
              </p>
              <div
                v-if="advancement.guide"
                class="advancement-guide"
              >
                <p v-if="advancement.guide.note">{{ advancement.guide.note }}</p>
                <p v-if="advancement.guide.intendedPath">
                  <b>Предполагаемый путь:</b>
                  {{ advancement.guide.intendedPath }}
                </p>
                <p>
                  <b>Точное условие:</b>
                  {{ advancement.guide.exactCondition }}
                </p>
                <NuxtLink
                  v-if="advancement.guide.link"
                  :to="advancement.guide.link.to"
                >
                  {{ advancement.guide.link.label }}
                  <PhArrowRight :size="15" />
                </NuxtLink>
              </div>
            </template>

            <code>{{ advancement.id }}</code>
          </div>
        </li>
      </ul>
    </section>
  </article>
</template>

<script setup lang="ts">
import { PhArrowRight, PhCampfire, PhCastleTurret, PhCompass, PhCrown } from '@phosphor-icons/vue'

const catalog = useWikiCatalog()

const stages = [
  {
    title: 'Первые 20-40 минут',
    summary: 'Дерево, костёр, сухая трава, саманная печь, медь и первый настоящий металл.',
    to: '/guides/first-day',
    icon: PhCampfire,
    goals: ['Не искать каменные инструменты', 'Сделать огниво и добыть 6 сухой травы', 'Перейти от дерева сразу к меди']
  },
  {
    title: 'Раннее выживание',
    summary: 'Лечебная еда, серебро, сталь, палатинатовый Silk Touch и первые постоянные сердца.',
    to: '/guides/early-game',
    icon: PhCompass,
    goals: ['Наладить лечение без шкалы голода', 'Выбрать первую ветку сплава', 'Не потратить первый обол случайно']
  },
  {
    title: 'Ад и благословения',
    summary: 'Эстус, бензол, Nazar, божественные фрагменты и адамант до похода в Энд.',
    to: '/guides/nether',
    icon: PhCastleTurret,
    goals: ['Стабилизировать эстус', 'Сохранить фрагмент для очей', 'Подготовить обережное снаряжение']
  },
  {
    title: 'Энд и пост-Энд',
    summary: 'Награда дракона, возобновляемая милость, Визер, адамант и четыре уникальных камня.',
    to: '/guides/endgame',
    icon: PhCrown,
    goals: ['Не тратить первую милость вслепую', 'Перейти к возобновляемым звёздам', 'Собрать пост-эндгейм устройства']
  }
]

const tutorial = computed(() => catalog.advancements.filter(entry => entry.section === 'tutorial'))

useSeoMeta({
  title: 'Путь прохождения',
  description: 'Подробная прогрессия Matcha Flavoured от первого костра и меди до Энда, Визера, адаманта и коллекционных целей.'
})
</script>

<style scoped lang="scss">
.progression-page {
  .progression-path {
    margin: 0;
    padding: 0;
    list-style: none;

    > li {
      position: relative;
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr);
      gap: 20px;
      padding: 0 0 52px;

      &:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 44px;
        bottom: 8px;
        left: 23px;
        width: 2px;
        background: var(--edge);
      }

      > svg {
        width: 48px;
        height: 48px;
        padding: 9px;
        color: var(--accent);
        background: var(--surface-quiet);
      }

      h2 {
        font-size: clamp(1.45rem, 3vw, 2.1rem);
      }

      p {
        max-width: 700px;
        margin: 10px 0;
        color: var(--muted);
      }

      ul {
        margin: 14px 0 12px;
        padding-left: 20px;
      }

      a {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-weight: 800;
      }
    }
  }

  .advancement-list {
    margin: 0;
    padding: 0;
    list-style: none;

    > li {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr);
      gap: 15px;
      padding: 14px 0;
      scroll-margin-top: 88px;

      + li {
        border-top: 1px solid var(--edge);
      }

      .advancement-copy {
        min-width: 0;
      }

      .advancement-description {
        margin: 3px 0;
        color: var(--muted);
        font-size: 14px;

        a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 3px;

          &:hover {
            text-decoration-thickness: 2px;
          }
        }
      }

      code {
        display: block;
        margin-top: 7px;
        color: var(--muted);
        font-size: 11px;
      }
    }

    .advancement-spoiler {
      margin-top: 4px;

      summary {
        width: fit-content;
        color: var(--muted);
        cursor: pointer;
        font-size: 14px;

        &:hover {
          color: var(--accent);
        }

        span {
          margin-left: 5px;
          color: var(--accent);
          font-family: 'Tiny5', monospace;
          font-size: 14px;
        }
      }
    }

    .advancement-guide {
      max-width: 760px;
      margin: 10px 0 4px;
      padding: 13px 15px;
      background: var(--surface-quiet);
      font-size: 13px;

      p {
        margin: 0;
        color: var(--muted);

        + p {
          margin-top: 7px;
        }
      }

      b {
        color: var(--ink);
      }

      > a {
        min-height: 32px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        font-weight: 800;
      }

      ul {
        margin: 9px 0 0;
        padding-left: 19px;
        columns: 2 240px;

        li {
          display: list-item;
          padding: 2px 12px 2px 0;
          break-inside: avoid;
        }
      }
    }
  }
}
</style>
