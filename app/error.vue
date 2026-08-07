<template>
  <WikiErrorState
    :status-code="error.statusCode"
    :message="error.statusMessage || error.message"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    statusMessage?: string
    message?: string
  }
}>()

useSeoMeta({
  title: () => props.error.statusCode === 404
    ? 'Страница не найдена'
    : 'Не удалось открыть страницу',
  robots: 'noindex, nofollow'
})
</script>
