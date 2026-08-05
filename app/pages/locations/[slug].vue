<template>
  <AcquisitionSourceGuide
    v-if="location"
    :source="location"
    :methods="methods"
    :targets="catalog.acquisition.targets"
    :kind-label="kindLabel"
    back-to="/locations"
    back-label="Все места"
    where-label="Где искать"
    action-label="Что делать"
  />
</template>

<script setup lang="ts">
const route = useRoute()
const catalog = useWikiCatalog()
const slug = computed(() => normalizeRouteParam(route.params.slug))
const location = computed(() => (
  catalog.acquisition.locations.find(entry => entry.slug === slug.value)
))
const methods = computed(() => {
  const ids = new Set(location.value?.methodIds ?? [])
  return catalog.acquisition.methods.filter(method => ids.has(method.id))
})
const kindLabel = computed(() => {
  if (location.value?.kind === 'archaeology') return 'Археология'
  if (location.value?.kind === 'mixed') return 'Сундуки и археология'
  return 'Структура'
})

if (import.meta.server && !location.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Место не найдено'
  })
}

onMounted(() => {
  if (!location.value) {
    showError({
      statusCode: 404,
      statusMessage: 'Место не найдено'
    })
  }
})

useWikiSeo({
  title: () => location.value?.name ?? 'Место',
  description: () => location.value
    ? `${location.value.name} в Matcha Flavoured: где искать, что делать и какие особые предметы можно получить.`
    : ''
})
</script>
