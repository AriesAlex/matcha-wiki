<template>
  <article class="source-page">
    <NuxtLink
      class="back-link"
      :to="backTo"
    >
      <PhArrowLeft :size="18" aria-hidden="true" />
      {{ backLabel }}
    </NuxtLink>

    <header class="page-heading">
      <p class="eyebrow">{{ kindLabel }}</p>
      <h1>{{ source.name }}</h1>
      <p>{{ source.summary }}</p>
    </header>

    <section
      class="field-notes"
      aria-label="Краткий маршрут"
    >
      <div>
        <p class="eyebrow">{{ whereLabel }}</p>
        <p>{{ source.where }}</p>
      </div>
      <div>
        <p class="eyebrow">{{ actionLabel }}</p>
        <p>{{ source.action }}</p>
      </div>
    </section>

    <section class="article-section">
      <header class="section-heading">
        <p class="eyebrow">Особая добыча Matcha</p>
        <h2>Что здесь искать</h2>
        <p>
          Ниже показаны изменённые и добавленные паком находки.
          Обычная ванильная мелочь не дублируется.
        </p>
      </header>
      <AcquisitionLootList
        :methods="methods"
        :targets="targets"
      />
    </section>
  </article>
</template>

<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'
import type {
  AcquisitionLocation,
  AcquisitionMethod,
  AcquisitionMob,
  AcquisitionTarget
} from '../../types/acquisition'

defineProps<{
  source: AcquisitionLocation | AcquisitionMob
  methods: AcquisitionMethod[]
  targets: AcquisitionTarget[]
  kindLabel: string
  backTo: '/locations' | '/mobs'
  backLabel: string
  whereLabel: string
  actionLabel: string
}>()
</script>

<style scoped lang="scss">
.source-page {
  .page-heading {
    margin-bottom: 38px;
  }

  .field-notes {
    max-width: 920px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 32px;
    padding: 24px 0;
    border-block: 1px solid var(--edge);

    p {
      margin: 0;
    }

    .eyebrow {
      margin-bottom: 5px;
    }
  }

  @media (max-width: 680px) {
    .page-heading {
      margin-bottom: 28px;
    }

    .field-notes {
      grid-template-columns: minmax(0, 1fr);
      gap: 22px;
    }
  }
}
</style>
