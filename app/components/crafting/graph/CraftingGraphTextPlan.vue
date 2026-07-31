<template>
  <details class="text-plan">
    <summary>Показать путь списком</summary>
    <ol>
      <li
        v-for="node in graph.nodes"
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
        <span>{{ playerDescription(node) }}</span>

        <ul v-if="node.node.kind === 'alternatives'">
          <li
            v-for="option in node.node.options"
            :key="option.key"
          >
            <NuxtLink v-if="option.path" :to="option.path">
              {{ option.title }}
            </NuxtLink>
            <strong v-else>{{ option.title }}</strong>
            <span>{{ option.detail }}</span>
          </li>
        </ul>
      </li>
    </ol>
  </details>
</template>

<script setup lang="ts">
import type {
  CraftingGraphNodeView,
  CraftingGraphView
} from '../../../types/craftingGraph'

const props = defineProps<{
  graph: CraftingGraphView
}>()

const route = useRoute()
const nodeById = computed(() => new Map(
  props.graph.nodes.map(node => [node.instanceId, node])
))
const incomingById = computed(() => {
  const incoming = new Map<string, string[]>()
  for (const edge of props.graph.edges) {
    const parents = incoming.get(edge.to) ?? []
    parents.push(edge.from)
    incoming.set(edge.to, parents)
  }
  return incoming
})

function detailsPath(node: CraftingGraphNodeView): string {
  const path = node.node.kind === 'item' || node.node.kind === 'recipe'
    ? node.node.detailsPath
    : node.node.kind === 'source'
      ? node.node.source.path
      : undefined

  return path && normalizeWikiPath(route.path) !== normalizeWikiPath(path)
    ? path
    : ''
}

function playerDescription(node: CraftingGraphNodeView): string {
  if (node.instanceId === props.graph.rootId) {
    return sentence('Итоговый предмет', node.node.detail)
  }

  const owners = ownerTitles(node).slice(0, 2)
  const ownerText = owners.length ? ` «${owners.join('», «')}»` : ''

  if (node.node.kind === 'recipe') {
    return sentence(`Способ изготовить${ownerText}`, node.node.detail)
  }
  if (node.node.kind === 'item') {
    return sentence(`Материал для${ownerText}`, node.node.detail)
  }
  if (node.node.kind === 'source') {
    return sentence(`Способ получить${ownerText}`, node.node.detail)
  }
  return node.node.alternativeKind === 'source'
    ? sentence(`Где получить${ownerText}`, node.node.detail)
    : sentence(`Подходящие материалы для${ownerText}`, node.node.detail)
}

function ownerTitles(node: CraftingGraphNodeView): string[] {
  const owners = ownerItems(node.instanceId, new Set([node.instanceId]))
  return [...new Set(owners.map(owner => (
    stripMinecraftFormatting(owner.node.title)
  )))]
}

function ownerItems(
  instanceId: string,
  visited: Set<string>
): CraftingGraphNodeView[] {
  return parentNodes(instanceId).flatMap((parent) => {
    if (visited.has(parent.instanceId)) return []
    if (parent.node.kind === 'item') return [parent]
    visited.add(parent.instanceId)
    return ownerItems(parent.instanceId, visited)
  })
}

function parentNodes(instanceId: string): CraftingGraphNodeView[] {
  return (incomingById.value.get(instanceId) ?? []).flatMap((parentId) => {
    const parent = nodeById.value.get(parentId)
    return parent ? [parent] : []
  })
}

function sentence(prefix: string, detail: string): string {
  const cleanPrefix = prefix.trim()
  const cleanDetail = detail.trim()
  if (!cleanDetail) return `${cleanPrefix}.`
  return `${cleanPrefix}. ${cleanDetail}`
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

    ul {
      margin: 6px 0 4px;
      padding-left: 22px;
      list-style: disc;

      li {
        padding: 3px 0;
      }
    }
  }
}
</style>
