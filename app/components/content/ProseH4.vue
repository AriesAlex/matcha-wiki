<template>
  <WikiHeading
    :id="id"
    :level="4"
  >
    <slot />
  </WikiHeading>
</template>

<script setup lang="ts">
defineProps<{
  id?: string
}>()
</script>
