<template>
  <div class="alternatives-pane">
    <template v-if="node.alternativeKind === 'ingredient'">
      <p class="intro">
        {{ ingredientIntro }}
        <span v-if="node.count">Нужно: {{ node.count }}.</span>
      </p>

      <label v-if="!acceptsAnyOption && selectableOptions.length">
        <span>Материал для этой ветки</span>
        <select
          :value="node.selectedOptionKey"
          @change="selectOption"
        >
          <option
            v-for="option in selectableOptions"
            :key="option.key"
            :value="option.targetKey"
          >
            {{ option.title }}
          </option>
        </select>
      </label>

      <div v-if="selectedOption && !acceptsAnyOption" class="selected-option">
        <CraftingAlternativeOptionIcon :option="selectedOption" />
        <div>
          <NuxtLink v-if="selectedOption.path" :to="selectedOption.path">
            {{ selectedOption.title }}
          </NuxtLink>
          <strong v-else>{{ selectedOption.title }}</strong>
          <small>{{ selectedOption.detail }}</small>
        </div>
      </div>

      <ul v-else class="ingredients" aria-label="Подходящие материалы">
        <li
          v-for="option in node.options"
          :key="option.key"
        >
          <NuxtLink v-if="option.path" :to="option.path">
            <CraftingAlternativeOptionIcon :option="option" />
            <CraftingAlternativeOptionCopy :option="option" />
          </NuxtLink>
          <span v-else>
            <CraftingAlternativeOptionIcon :option="option" />
            <CraftingAlternativeOptionCopy :option="option" />
          </span>
        </li>
      </ul>
    </template>

    <template v-else>
      <p class="intro">Выберите удобный способ — достаточно любого одного.</p>
      <ul class="sources" aria-label="Способы получения">
        <li
          v-for="option in node.options"
          :key="option.key"
        >
          <NuxtLink v-if="option.path" :to="option.path">
            <CraftingSourceIcon :kind="option.sourceKind" :size="22" />
            <span>
              <strong>{{ option.title }}</strong>
              <small>{{ option.detail }}</small>
            </span>
            <PhArrowRight :size="18" aria-hidden="true" />
          </NuxtLink>
          <div v-else>
            <CraftingSourceIcon :kind="option.sourceKind" :size="22" />
            <span>
              <strong>{{ option.title }}</strong>
              <small>{{ option.detail }}</small>
            </span>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  PhArrowRight
} from '@phosphor-icons/vue'
import CraftingAlternativeOptionCopy from './CraftingAlternativeOptionCopy.vue'
import CraftingAlternativeOptionIcon from './CraftingAlternativeOptionIcon.vue'
import CraftingSourceIcon from './CraftingSourceIcon.vue'
import type {
  CraftingGraphAlternativeOption,
  CraftingGraphAlternativesNode
} from '../../../types/craftingGraph'

const props = defineProps<{
  node: CraftingGraphAlternativesNode
}>()

const emit = defineEmits<{
  'select-option': [payload: {
    requirementKey: string
    targetKey: string
  }]
}>()

const acceptsAnyOption = computed(() => (
  props.node.options.length > 1
  && props.node.options.every(option => option.selected)
))
const selectableOptions = computed(() => (
  props.node.options.filter((option): option is CraftingGraphAlternativeOption & {
    targetKey: string
  } => Boolean(option.targetKey))
))
const selectedOption = computed(() => (
  props.node.options.find(option => option.selected)
  ?? props.node.options.find(option => option.targetKey === props.node.selectedOptionKey)
))
const ingredientIntro = computed(() => (
  acceptsAnyOption.value
    ? 'Подойдёт любой из этих материалов — отдельный выбор не нужен.'
    : 'Выберите материал, который хотите использовать в этой ветке.'
))

function selectOption(event: Event): void {
  if (!props.node.requirementId) return
  emit('select-option', {
    requirementKey: props.node.requirementId,
    targetKey: (event.target as HTMLSelectElement).value
  })
}
</script>

<style scoped lang="scss">
.alternatives-pane {
  .intro {
    margin: 18px 0 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;

    span {
      display: block;
      margin-top: 3px;
      color: var(--ink);
      font-weight: 700;
    }
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 16px;

    > span {
      color: var(--muted);
      font-size: 11px;
    }

    select {
      width: 100%;
      min-height: 44px;
      padding: 7px 32px 7px 10px;
      color: var(--ink);
      background: var(--surface);
      border: 1px solid var(--edge);
      font-size: 12px;
    }
  }

  .selected-option {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 10px;
    background: var(--surface-quiet);

    > div {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    a,
    strong {
      color: var(--ink);
      font-size: 12px;
      font-weight: 750;
    }

    a:hover,
    a:focus-visible {
      color: var(--accent);
    }

    small {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.35;
    }
  }

  ul {
    display: grid;
    gap: 8px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;

    a,
    li > span,
    li > div {
      min-width: 0;
      display: grid;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      color: var(--ink);
      background: var(--surface-quiet);
      text-decoration: none;
    }

    a:hover,
    a:focus-visible {
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, var(--surface));
    }
  }

  .ingredients {
    a,
    li > span {
      grid-template-columns: 42px minmax(0, 1fr);
    }
  }

  .sources {
    a,
    li > div {
      grid-template-columns: 24px minmax(0, 1fr);
    }

    a {
      grid-template-columns: 24px minmax(0, 1fr) 18px;
    }

    svg:first-child {
      color: var(--muted);
    }

    span {
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
      font-size: 12px;
    }

    small {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.4;
    }
  }
}
</style>
