<template>
  <article class="mobs-page">
    <header class="page-heading">
      <p class="eyebrow">Обитатели мира</p>
      <h1>Мобы и добыча</h1>
      <p>
        Где встретить изменённых Matcha существ, что с них выпадает
        и когда для редкой находки важны личное убийство или «Добыча».
      </p>
    </header>

    <nav
      class="related-catalog"
      aria-label="Другие источники"
    >
      Ищете сундуки и раскопки?
      <NuxtLink to="/locations">Откройте справочник мест</NuxtLink>.
    </nav>

    <AcquisitionSourceList
      :sources="catalog.acquisition.mobs"
      :methods="catalog.acquisition.methods"
      :targets="catalog.acquisition.targets"
      base-path="/mobs"
    />
  </article>
</template>

<script setup lang="ts">
const catalog = useWikiCatalog()

useWikiSeo({
  title: 'Мобы и добыча',
  description: 'Мобы Matcha Flavoured: где встретить, как победить и какие особые предметы с них выпадают.'
})
</script>

<style scoped lang="scss">
.mobs-page {
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
