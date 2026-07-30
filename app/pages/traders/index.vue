<template>
  <article class="traders-page">
    <header class="page-heading">
      <p class="eyebrow">Жители и обмен</p>
      <h1>Торговцы</h1>
      <p>
        Кто продаёт полезные вещи, кто покупает вашу добычу и сколько
        предметов нужно принести. Показаны только реально доступные сделки.
      </p>
    </header>

    <nav
      class="system-link"
      aria-label="О механике торговли"
    >
      Нужны общие правила жителей?
      <NuxtLink to="/mechanics/villagers">
        Откройте разбор системы торговли
      </NuxtLink>.
    </nav>

    <TraderCatalogList :traders="catalog.traders" />
  </article>
</template>

<script setup lang="ts">
import TraderCatalogList from '../../components/traders/TraderCatalogList.vue'

const catalog = useWikiCatalog()

useSeoMeta({
  title: 'Торговцы',
  description: 'Все доступные торговцы Matcha Flavoured: точные цены, товары, уровни и полезные обмены в удобном виде.'
})
</script>

<style scoped lang="scss">
.traders-page {
  .system-link {
    max-width: 940px;
    margin: -24px 0 30px;
    color: var(--muted);

    a {
      font-weight: 700;
    }
  }
}
</style>
