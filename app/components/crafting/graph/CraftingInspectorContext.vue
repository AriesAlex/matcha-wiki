<template>
  <div class="context-pane">
    <label v-if="node.contextKind === 'choice'">
      <span>{{ roleLabel(node.role) }}</span>
      <select
        :value="node.selectedOptionKey"
        @change="selectOption"
      >
        <option
          v-for="option in node.options"
          :key="option.key"
          :value="option.key"
        >
          {{ stripMinecraftFormatting(option.target.title) }}
        </option>
      </select>
    </label>
    <p v-else-if="node.contextKind === 'station'">
      Этот рабочий блок тоже показан на схеме отдельной веткой.
    </p>
    <p v-else>
      {{ node.source.detail }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { CraftingGraphContextNode } from '../../../types/craftingGraph'
import type { RecipeRequirementRole } from '../../../types/wiki'

const props = defineProps<{
  node: CraftingGraphContextNode
}>()

const emit = defineEmits<{
  'select-option': [payload: {
    requirementKey: string
    targetKey: string
  }]
}>()

function selectOption(event: Event): void {
  if (props.node.contextKind !== 'choice') return
  emit('select-option', {
    requirementKey: props.node.requirementId,
    targetKey: (event.target as HTMLSelectElement).value
  })
}

function roleLabel(role: RecipeRequirementRole): string {
  return {
    ingredient: 'Подходящий материал',
    template: 'Шаблон',
    base: 'Основа',
    addition: 'Добавка'
  }[role]
}
</script>

<style scoped lang="scss">
.context-pane {
  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 20px;

    span {
      color: var(--muted);
      font-size: 11px;
    }

    select {
      width: 100%;
      min-height: 44px;
      padding: 7px 32px 7px 10px;
      background: var(--surface);
      border: 1px solid var(--edge);
      font-size: 12px;
    }
  }

  p {
    margin: 18px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
}
</style>
