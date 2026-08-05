<template>
  <AcquisitionSourceGuide
    v-if="mob"
    :source="mob"
    :methods="methods"
    :targets="catalog.acquisition.targets"
    kind-label="Моб"
    back-to="/mobs"
    back-label="Все мобы"
    where-label="Где встретить"
    action-label="Как получить добычу"
  />
</template>

<script setup lang="ts">
const route = useRoute()
const catalog = useWikiCatalog()
const slug = computed(() => normalizeRouteParam(route.params.slug))
const mob = computed(() => (
  catalog.acquisition.mobs.find(entry => entry.slug === slug.value)
))
const methods = computed(() => {
  const ids = new Set(mob.value?.methodIds ?? [])
  return catalog.acquisition.methods.filter(method => ids.has(method.id))
})

if (import.meta.server && !mob.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Моб не найден'
  })
}

onMounted(() => {
  if (!mob.value) {
    showError({
      statusCode: 404,
      statusMessage: 'Моб не найден'
    })
  }
})

useWikiSeo({
  title: () => mob.value?.name ?? 'Моб',
  description: () => mob.value
    ? `${mob.value.name} в Matcha Flavoured: где встретить, как победить и какие особые предметы получить.`
    : ''
})
</script>
