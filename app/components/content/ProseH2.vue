<template>
  <WikiHeading
    :id="id"
    :level="2"
  >
    <slot />
  </WikiHeading>
</template>

<script setup lang="ts">
defineProps<{
  id?: string
}>()
</script>
