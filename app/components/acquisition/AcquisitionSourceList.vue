<template>
  <ul class="source-list">
    <li
      v-for="row in rows"
      :key="row.source.id"
    >
      <NuxtLink :to="`${basePath}/${row.source.slug}`">
        <span
          class="preview"
          aria-hidden="true"
        >
          <ItemSlotSurface
            v-for="target in row.previewTargets"
            :key="target.id"
            :icon-url="target.stack.icon ? useAssetPath(target.stack.icon) : ''"
            :display-name="target.stack.name"
          />
        </span>
        <span class="copy">
          <strong>{{ row.source.name }}</strong>
          <small>{{ row.source.summary }}</small>
          <span>
            {{ row.targetCount }}
            {{ russianWordForm(row.targetCount, ['особая находка', 'особые находки', 'особых находок']) }}
          </span>
        </span>
        <PhArrowRight
          class="arrow"
          :size="22"
          aria-hidden="true"
        />
      </NuxtLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import type {
  AcquisitionLocation,
  AcquisitionMethod,
  AcquisitionMob,
  AcquisitionTarget
} from '../../types/acquisition'
import { russianWordForm } from '../../utils/russianGrammar'

const props = defineProps<{
  sources: Array<AcquisitionLocation | AcquisitionMob>
  methods: AcquisitionMethod[]
  targets: AcquisitionTarget[]
  basePath: '/locations' | '/mobs'
}>()

const methodById = computed(() => new Map(
  props.methods.map(method => [method.id, method])
))
const targetById = computed(() => new Map(
  props.targets.map(target => [target.id, target])
))
const rows = computed(() => props.sources.map((source) => {
  const targetIds = [...new Set(source.methodIds.flatMap((methodId) => {
    const targetId = methodById.value.get(methodId)?.targetId
    return targetId ? [targetId] : []
  }))]
  const previewTargets = targetIds
    .flatMap((targetId) => {
      const target = targetById.value.get(targetId)
      return target ? [target] : []
    })
    .slice(0, 3)

  return {
    source,
    previewTargets,
    targetCount: targetIds.length
  }
}))
</script>

<style scoped lang="scss">
.source-list {
  max-width: 920px;
  margin: 0;
  padding: 0;
  list-style: none;

  li + li {
    border-top: 1px solid var(--edge);
  }

  a {
    min-height: 106px;
    display: grid;
    grid-template-columns: minmax(76px, auto) minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    padding: 16px 8px;
    color: var(--ink);
    text-decoration: none;

    &:hover,
    &:focus-visible {
      background: var(--surface-quiet);

      .arrow {
        color: var(--accent);
        transform: translateX(4px);
      }
    }
  }

  .preview {
    display: flex;
    padding-right: 14px;

    :deep(.slot + .slot) {
      margin-left: -18px;
    }
  }

  .copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    strong {
      font-size: 18px;
    }

    small {
      max-width: 680px;
      margin-top: 3px;
      color: var(--muted);
      line-height: 1.45;
    }

    > span {
      margin-top: 7px;
      color: var(--accent);
      font-family: 'Tiny5', monospace;
      font-size: 16px;
    }
  }

  .arrow {
    color: var(--muted);
    transition:
      color 120ms ease,
      transform 120ms ease;
  }

  @media (max-width: 620px) {
    a {
      grid-template-columns: 58px minmax(0, 1fr) auto;
      gap: 12px;
      padding-inline: 0;
    }

    .preview {
      width: 58px;
      overflow: hidden;
      padding: 0;

      :deep(.slot + .slot) {
        display: none;
      }
    }

    .copy {
      small {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
    }
  }
}
</style>
