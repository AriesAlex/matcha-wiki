<template>
  <ul class="loot-rows">
    <li
      v-for="group in groups"
      :key="group.target.id"
    >
      <ItemStackReference
        :stack="group.target.stack"
        :target="group.target"
      />

      <ul class="routes">
        <li
          v-for="method in group.methods"
          :key="method.id"
        >
          <p>
            <strong>{{ method.context }}</strong>
            <span v-if="quantityLabel(method)">
              {{ quantityLabel(method) }}
            </span>
          </p>
          <p
            v-for="note in method.notes"
            :key="`${note.kind}:${note.text}`"
            class="note"
            :class="note.kind"
          >
            {{ note.text }}
          </p>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type {
  AcquisitionMethod,
  AcquisitionTarget
} from '../../types/acquisition'

defineProps<{
  groups: Array<{
    target: AcquisitionTarget
    methods: AcquisitionMethod[]
  }>
}>()

function quantityLabel(method: AcquisitionMethod): string {
  const { min, max } = method.quantity
  if (min === 1 && max === 1) return ''
  return min === max ? `×${min}` : `×${min}–${max}`
}
</script>

<style scoped lang="scss">
.loot-rows {
  max-width: 920px;
  margin: 0;
  padding: 0;
  list-style: none;

  > li {
    display: grid;
    grid-template-columns: minmax(220px, 0.8fr) minmax(280px, 1.2fr);
    gap: 28px;
    padding: 18px 0;

    + li {
      border-top: 1px solid var(--edge);
    }
  }

  .routes {
    margin: 0;
    padding: 0;
    list-style: none;

    > li + li {
      margin-top: 12px;
    }

    p {
      margin: 0;
      line-height: 1.45;

      span {
        margin-left: 8px;
        color: var(--accent);
        font-family: 'Cascadia Mono', monospace;
        font-size: 13px;
        font-weight: 700;
      }
    }

    .note {
      margin-top: 3px;
      color: var(--muted);
      font-size: 13px;

      &.requirement {
        color: var(--ink);
      }

      &.bonus {
        color: var(--accent);
      }
    }
  }

  @media (max-width: 700px) {
    > li {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      padding-block: 20px;
    }

    .routes {
      padding-left: 54px;
    }
  }
}
</style>
