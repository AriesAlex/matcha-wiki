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

    <ol class="progression-path">
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
      <ul class="advancement-list">
        <li
          v-for="advancement in tutorial"
          :key="advancement.id"
        >
          <ItemSlot :stack="advancement.icon" />
          <span>
            <strong>{{ stripMinecraftFormatting(advancement.title) }}</strong>
            <p>{{ stripMinecraftFormatting(advancement.description) }}</p>
            <code>{{ advancement.id }}</code>
          </span>
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

    li {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr);
      gap: 15px;
      padding: 14px 0;

      + li {
        border-top: 1px solid var(--edge);
      }

      > span {
        min-width: 0;
      }

      p {
        margin: 3px 0;
        color: var(--muted);
        font-size: 14px;
      }

      code {
        color: var(--muted);
        font-size: 11px;
      }
    }
  }
}
</style>
