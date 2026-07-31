<template>
  <article
    class="alternatives"
    :class="{ selected, inactive, root }"
  >
    <button
      class="heading"
      type="button"
      :aria-label="accessibleName"
      :aria-expanded="selected"
      aria-controls="crafting-node-inspector"
      @click="emit('open-details')"
    >
      <component
        :is="node.alternativeKind === 'source' ? PhMapPin : PhArrowsSplit"
        :size="24"
        weight="bold"
        aria-hidden="true"
      />
      <span>
        <strong>{{ node.title }}</strong>
        <small>{{ node.detail }}</small>
      </span>
    </button>

    <div class="options">
      <template
        v-for="(option, index) in visibleOptions"
        :key="option.instanceId"
      >
        <span v-if="index" class="or" aria-hidden="true">ИЛИ</span>

        <NuxtLink
          v-if="node.alternativeKind === 'source' && option.path"
          class="option source"
          :to="option.path"
        >
          <CraftingSourceIcon :kind="option.sourceKind" :size="22" />
          <OptionCopy :option="option" />
        </NuxtLink>

        <span
          v-else-if="node.alternativeKind === 'source'"
          class="option source"
        >
          <CraftingSourceIcon :kind="option.sourceKind" :size="22" />
          <OptionCopy :option="option" />
        </span>

        <span
          v-else-if="acceptsAnyOption"
          class="option ingredient any"
        >
          <OptionIcon :option="option" />
          <OptionCopy :option="option" />
          <PhCheck :size="19" weight="bold" aria-hidden="true" />
        </span>

        <label v-else class="option ingredient">
          <input
            type="radio"
            :name="radioName"
            :value="option.targetKey"
            :checked="option.selected"
            @change="selectOption(option.targetKey)"
          >
          <OptionIcon :option="option" />
          <OptionCopy :option="option" />
        </label>
      </template>

      <button
        v-if="hiddenOptionCount"
        class="more"
        type="button"
        @click="emit('open-details')"
      >
        Ещё {{ hiddenOptionCount }} {{ optionWord(hiddenOptionCount) }}
        <PhArrowRight :size="18" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowsSplit,
  PhArrowRight,
  PhCheck,
  PhMapPin
} from '@phosphor-icons/vue'
import type { CraftingGraphAlternativesNode } from '../../../types/craftingGraph'
import OptionCopy from './CraftingAlternativeOptionCopy.vue'
import OptionIcon from './CraftingAlternativeOptionIcon.vue'
import CraftingSourceIcon from './CraftingSourceIcon.vue'

const props = withDefaults(defineProps<{
  node: CraftingGraphAlternativesNode
  selected?: boolean
  inactive?: boolean
  root?: boolean
}>(), {
  selected: false,
  inactive: false,
  root: false
})

const emit = defineEmits<{
  'open-details': []
  'select-option': [requirementId: string, targetKey: string]
}>()

const radioName = `crafting-option-${useId().replaceAll(':', '')}`
const accessibleName = computed(() => `${props.node.title}. ${props.node.detail}`)
const visibleOptions = computed(() => visibleCraftingAlternatives(props.node))
const hiddenOptionCount = computed(() => (
  hiddenCraftingAlternativeCount(props.node)
))
const acceptsAnyOption = computed(() => (
  props.node.options.length > 1
  && props.node.options.every(option => option.selected)
))

function selectOption(targetKey: string | undefined): void {
  if (!props.node.requirementId || !targetKey) return
  emit('select-option', props.node.requirementId, targetKey)
}

function optionWord(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'вариантов'
  if (last === 1) return 'вариант'
  if (last >= 2 && last <= 4) return 'варианта'
  return 'вариантов'
}
</script>

<style scoped lang="scss">
.alternatives {
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--ink);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  border: 1px solid var(--edge);
  box-shadow: 0 8px 22px var(--shadow);
  transition:
    opacity 150ms ease,
    filter 150ms ease;

  &.selected {
    border-color: var(--accent);
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--accent) 36%, transparent),
      0 8px 22px var(--shadow);
  }

  &.root {
    border-width: 2px;
  }

  &.inactive {
    opacity: 0.3;
    filter: grayscale(0.82);

    &:hover,
    &:focus-within {
      opacity: 0.7;
    }
  }

  .heading {
    width: 100%;
    height: 78px;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    color: inherit;
    background: transparent;
    border: 0;
    text-align: left;

    &:hover,
    &:focus-visible {
      background: var(--surface-quiet);
    }

    > svg {
      color: var(--muted);
    }

    > span {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    strong,
    small {
      overflow-wrap: anywhere;
    }

    strong {
      font-size: 14px;
      line-height: 1.2;
    }

    small {
      color: var(--muted);
      font-size: 10px;
      line-height: 1.3;
    }
  }

  .options {
    padding-bottom: 12px;
  }

  .or {
    height: 18px;
    display: grid;
    place-items: center;
    color: var(--muted);
    font-family: 'Tiny5', monospace;
    font-size: 12px;
    line-height: 1;
  }

  .option {
    box-sizing: border-box;
    width: 100%;
    height: 88px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    color: inherit;
    background: color-mix(in srgb, var(--surface-deep) 42%, transparent);
    text-decoration: none;

    &:hover,
    &:focus-visible,
    &:focus-within {
      background: var(--surface-quiet);
    }

    &.source > svg {
      justify-self: center;
      color: var(--muted);
    }

    &.ingredient {
      cursor: pointer;

      input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
      }

      &:has(input:checked) {
        background: color-mix(in srgb, var(--accent) 10%, var(--surface));
        box-shadow: inset 3px 0 0 var(--accent);
      }

      &:focus-within {
        outline: 3px solid var(--accent);
        outline-offset: -3px;
      }
    }

    &.any {
      grid-template-columns: 42px minmax(0, 1fr) 22px;
      cursor: default;

      > svg:last-child {
        color: var(--accent);
      }
    }
  }


  .more {
    width: calc(100% - 24px);
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 8px 12px 0;
    padding: 0 10px;
    color: var(--accent);
    background: transparent;
    border: 0;
    font-size: 11px;
    font-weight: 750;

    &:hover,
    &:focus-visible {
      color: var(--accent-ink);
      background: var(--surface-quiet);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .alternatives {
    transition: none;
  }
}
</style>
