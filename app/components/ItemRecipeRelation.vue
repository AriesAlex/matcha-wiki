<template>
  <article class="recipe-relation">
    <span class="recipe-icon" aria-hidden="true">
      <PhHammer :size="24" />
    </span>

    <div class="copy">
      <span
        v-if="relation.context"
        class="context"
      >
        {{ relation.context }}
      </span>
      <ItemStackReference
        :stack="relation.result.stack"
        :label="relation.result.title"
        :secondary="relation.description"
      />
    </div>

    <NuxtLink
      v-if="relation.to"
      class="recipe-link"
      :to="relation.to"
    >
      Открыть рецепт
      <PhArrowRight :size="18" aria-hidden="true" />
    </NuxtLink>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhHammer
} from '@phosphor-icons/vue'
import type {
  ItemRelationStackView,
  ItemRelationView
} from '../types/wiki'

defineProps<{
  relation: ItemRelationView & {
    result: ItemRelationStackView
  }
}>()
</script>

<style scoped lang="scss">
.recipe-relation {
  min-height: 72px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 0;

  .recipe-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    color: var(--accent);
    background: var(--surface-quiet);
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .context {
    color: var(--muted);
    font-size: 12px;
  }

  .recipe-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--accent-ink);
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  }
}

@media (max-width: 560px) {
  .recipe-relation {
    grid-template-columns: 38px minmax(0, 1fr);

    .recipe-link {
      grid-column: 2;
      width: fit-content;
    }
  }
}
</style>
