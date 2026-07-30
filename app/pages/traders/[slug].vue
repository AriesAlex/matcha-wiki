<template>
  <article
    v-if="trader"
    class="trader-page"
  >
    <NuxtLink
      class="back-link"
      to="/traders"
    >
      <PhArrowLeft :size="18" aria-hidden="true" />
      Все торговцы
    </NuxtLink>

    <header class="page-heading">
      <p class="eyebrow">Торговец</p>
      <h1>{{ trader.title }}</h1>
      <p>{{ trader.summary }}</p>
    </header>

    <section class="field-notes">
      <div v-if="trader.jobSite">
        <p class="eyebrow">Рабочее место</p>
        <ItemStackReference
          :stack="trader.jobSite.stack"
          :label="trader.jobSite.title"
        />
      </div>
      <div>
        <p class="eyebrow">Что брать в первую очередь</p>
        <p>{{ trader.priority }}</p>
      </div>
      <div v-if="trader.vanillaTitle">
        <p class="eyebrow">Кого заменяет</p>
        <p>{{ trader.vanillaTitle }}</p>
      </div>
    </section>

    <TradeSetSection
      v-for="set in trader.sets"
      :key="set.id"
      :set="set"
      :restocks="trader.slug !== 'wandering-trader'"
    />
  </article>
</template>

<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'
import TradeSetSection from '../../components/traders/TradeSetSection.vue'

const route = useRoute()
const catalog = useWikiCatalog()
const slug = computed(() => normalizeRouteParam(route.params.slug))
const trader = computed(() => (
  catalog.traders.find(entry => entry.slug === slug.value)
))

if (import.meta.server && !trader.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Торговец не найден'
  })
}

onMounted(() => {
  if (!trader.value) {
    showError({
      statusCode: 404,
      statusMessage: 'Торговец не найден'
    })
  }
})

useSeoMeta({
  title: () => trader.value?.title ?? 'Торговец',
  description: () => trader.value
    ? `${trader.value.title} в Matcha Flavoured: все доступные сделки, точные цены и полезные покупки.`
    : ''
})
</script>

<style scoped lang="scss">
.trader-page {
  .page-heading {
    margin-bottom: 38px;
  }

  .field-notes {
    max-width: 940px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 30px;
    padding: 24px 0;
    border-block: 1px solid var(--edge);

    p {
      margin: 0;
      line-height: 1.5;
    }

    .eyebrow {
      margin-bottom: 8px;
    }
  }

  @media (max-width: 820px) {
    .field-notes {
      grid-template-columns: minmax(0, 1fr);
      gap: 22px;
    }
  }
}
</style>
