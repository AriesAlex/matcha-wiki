<template>
  <component
    :is="icon"
    :size="size"
    weight="bold"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import {
  PhMapPin,
  PhPawPrint,
  PhStorefront
} from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { CraftingSourceView } from '../../../types/crafting'

const props = withDefaults(defineProps<{
  kind?: CraftingSourceView['kind']
  size?: number
}>(), {
  kind: 'location',
  size: 24
})

const icon = computed<Component>(() => ({
  location: PhMapPin,
  mob: PhPawPrint,
  trader: PhStorefront
})[props.kind])
</script>
