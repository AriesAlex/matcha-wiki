<template>
  <WikiHeading
    :id="id"
    :level="3"
  >
    <slot />
  </WikiHeading>
</template>

<script setup lang="ts">
defineProps<{
  id?: string
}>()
</script>
