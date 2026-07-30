<template>
  <article class="locations-page">
    <header class="page-heading">
      <p class="eyebrow">Исследование мира</p>
      <h1>Места и находки</h1>
      <p>
        Куда идти за особыми предметами Matcha: сундуки структур,
        тайники и археологические раскопки с понятным маршрутом.
      </p>
    </header>

    <nav
      class="related-catalog"
      aria-label="Другие источники"
    >
      Ищете добычу с противников?
      <NuxtLink to="/mobs">Откройте справочник мобов</NuxtLink>.
    </nav>

    <AcquisitionSourceList
      :sources="catalog.acquisition.locations"
      :methods="catalog.acquisition.methods"
      :targets="catalog.acquisition.targets"
      base-path="/locations"
    />
  </article>
</template>

<script setup lang="ts">
const catalog = useWikiCatalog()

useSeoMeta({
  title: 'Места и находки',
  description: 'Структуры, сундуки и археология Matcha Flavoured: где искать и какие особые предметы можно получить.'
})
</script>

<style scoped lang="scss">
.locations-page {
  .related-catalog {
    max-width: 920px;
    margin: -24px 0 30px;
    color: var(--muted);

    a {
      font-weight: 700;
    }
  }
}
</style>
