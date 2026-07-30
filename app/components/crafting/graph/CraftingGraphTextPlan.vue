<template>
  <details class="text-plan">
    <summary>Показать путь списком</summary>
    <ol>
      <li
        v-for="node in nodes"
        :key="node.instanceId"
      >
        <NuxtLink
          v-if="detailsPath(node)"
          :to="detailsPath(node)"
        >
          <MinecraftText :text="node.node.title" />
        </NuxtLink>
        <strong v-else>
          <MinecraftText :text="node.node.title" />
        </strong>
        <span>{{ node.detail }}</span>
      </li>
    </ol>
  </details>
</template>

<script setup lang="ts">
import type { CraftingGraphNodeView } from '../../../types/craftingGraph'

defineProps<{
  nodes: readonly CraftingGraphNodeView[]
}>()

const route = useRoute()

function detailsPath(node: CraftingGraphNodeView): string {
  const path = node.node.kind === 'item' || node.node.kind === 'method'
    ? node.node.detailsPath
    : node.node.contextKind === 'source'
      ? node.node.source.path
      : undefined

  return path && normalizeWikiPath(route.path) !== normalizeWikiPath(path)
    ? path
    : ''
}
</script>

<style scoped lang="scss">
.text-plan {
  border-top: 1px solid var(--edge);

  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    width: fit-content;
    padding: 8px 16px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  ol {
    max-height: 300px;
    overflow: auto;
    margin: 0;
    padding: 4px 24px 20px 52px;
  }

  li {
    padding: 5px 0;

    a,
    strong,
    span {
      display: block;
    }

    a,
    strong {
      color: var(--ink);
      font-weight: 750;
    }

    span {
      color: var(--muted);
      font-size: 12px;
    }
  }
}
</style>
