<template>
  <NuxtLink
    :id="id"
    :to="entry.path"
    class="search-result"
    :class="{ active }"
    role="option"
    :aria-selected="active"
  >
    <span class="icon">
      <img
        v-if="entry.icon"
        :src="useAssetPath(entry.icon)"
        alt=""
        width="32"
        height="32"
      >
    </span>
    <span class="copy">
      <strong><MinecraftText :text="entry.title" /></strong>
      <span class="description">
        <MinecraftText :text="entry.description" />
      </span>
      <small>{{ entry.category }}</small>
    </span>
    <PhArrowRight
      :size="18"
      aria-hidden="true"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import type { WikiSearchEntry } from '../types/wiki'

defineProps<{
  id: string
  entry: WikiSearchEntry
  active: boolean
}>()
</script>

<style scoped lang="scss">
.search-result {
  min-height: 76px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  color: inherit;
  text-decoration: none;

  + .search-result {
    border-top: 1px solid var(--edge);
  }

  &:hover,
  &:focus-visible,
  &.active {
    color: inherit;
    background: var(--surface-quiet);
  }

  .icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-deep);

    img {
      width: 32px;
      height: 32px;
      object-fit: contain;
      image-rendering: pixelated;
    }
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;

    strong,
    .description,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: var(--accent);
      font-family: 'Tiny5', monospace;
      font-size: 18px;
      line-height: 1.1;
    }

    .description {
      margin-top: 3px;
      color: var(--ink);
      font-size: 13px;
    }

    strong,
    .description {
      :deep(.minecraft-text) {
        white-space: inherit;
      }
    }

    small {
      margin-top: 2px;
      color: var(--muted);
      font-size: 12px;
    }
  }
}
</style>
