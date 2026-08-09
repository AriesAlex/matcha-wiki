<template>
  <div class="nav-row" :class="{ 'child-row': nested }">
    <NuxtLink
      class="nav-link"
      :class="{ branch: branchActive }"
      :to="link.to"
    >
      {{ link.label }}
    </NuxtLink>
    <button
      v-if="expandable"
      class="disclosure"
      type="button"
      :class="{ expanded }"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      :aria-label="`${expanded ? 'Свернуть' : 'Развернуть'} «${link.label}»`"
      @click="emit('toggle')"
    >
      <PhCaretRight
        :size="nested ? 15 : 17"
        weight="bold"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { PhCaretRight } from '@phosphor-icons/vue'
import type { WikiNavigationLink } from '~/data/wikiNavigation'

withDefaults(defineProps<{
  link: WikiNavigationLink
  branchActive: boolean
  expandable: boolean
  expanded: boolean
  panelId: string
  nested?: boolean
}>(), {
  nested: false
})

const emit = defineEmits<{
  toggle: []
}>()
</script>

<style scoped lang="scss">
.nav-row {
  display: flex;
  align-items: center;
}

.nav-link {
  min-height: 36px;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  padding: 4px 10px;
  color: var(--ink);
  font-size: 14px;
  text-decoration: none;

  &:hover,
  &.branch {
    color: var(--accent);
  }

  &.router-link-exact-active {
    color: var(--accent);
    font-weight: 750;
  }
}

.disclosure {
  width: 36px;
  height: 36px;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--muted);
  background: transparent;
  border: 0;

  &:hover,
  &:focus-visible {
    color: var(--accent);
    background: var(--surface-quiet);
  }

  svg {
    transition: transform 140ms ease;
  }

  &.expanded svg {
    transform: rotate(90deg);
  }
}

.child-row {
  .nav-link {
    min-height: 32px;
    color: var(--muted);
    font-size: 12px;

    &:hover,
    &.branch {
      color: var(--accent);
    }
  }

  .disclosure {
    width: 32px;
    height: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .disclosure svg {
    transition: none;
  }
}
</style>
