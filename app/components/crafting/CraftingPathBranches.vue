<template>
  <div class="craft">
    <p class="instruction">
      <strong>{{ node.recipe?.station }}</strong>
      <span v-if="node.batches > 1">
        Повторите {{ node.batches }} {{ batchWord }}.
      </span>
      <NuxtLink
        v-if="node.recipe?.detailsPath"
        :to="node.recipe.detailsPath"
      >
        Показать схему
      </NuxtLink>
    </p>

    <div
      v-if="node.station"
      class="station"
    >
      <p>Сначала подготовьте рабочее место</p>
      <slot name="station" />
    </div>

    <TransitionGroup
      name="branch"
      tag="ul"
      class="requirements"
    >
      <li
        v-for="requirement in node.requirements"
        :key="requirement.id"
      >
        <label
          v-if="requirement.options.length > 1"
          class="alternative"
        >
          <span>{{ roleLabel(requirement.role) }}</span>
          <select
            :value="requirement.selectedOptionKey"
            @change="selectOption(requirement.id, $event)"
          >
            <option
              v-for="option in requirement.options"
              :key="option.key"
              :value="option.key"
            >
              {{ stripMinecraftFormatting(option.title) }}
            </option>
          </select>
        </label>
        <slot
          name="requirement"
          :requirement="requirement"
        />
      </li>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import type {
  CraftingPlanNode,
  CraftingPlanRequirement
} from '../../types/crafting'
import type { RecipeRequirementRole } from '../../types/wiki'

const props = defineProps<{
  node: CraftingPlanNode
}>()

defineSlots<{
  station(): unknown
  requirement(props: { requirement: CraftingPlanRequirement }): unknown
}>()

const emit = defineEmits<{
  'select-option': [requirementKey: string, optionKey: string]
}>()

const batchWord = computed(() => {
  const lastTwoDigits = props.node.batches % 100
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'раз'

  const lastDigit = props.node.batches % 10
  if (lastDigit === 1) return 'раз'
  if (lastDigit >= 2 && lastDigit <= 4) return 'раза'
  return 'раз'
})

function selectOption(requirementKey: string, event: Event): void {
  emit(
    'select-option',
    requirementKey,
    (event.target as HTMLSelectElement).value
  )
}

function roleLabel(role: RecipeRequirementRole): string {
  return {
    ingredient: 'Подойдёт один из вариантов',
    template: 'Выберите шаблон',
    base: 'Выберите основу',
    addition: 'Выберите добавку'
  }[role]
}
</script>

<style scoped lang="scss">
.craft {
  margin: 14px 0 0 21px;
  padding-left: 32px;
  border-left: 2px solid color-mix(in srgb, var(--accent) 48%, var(--edge));

  .instruction {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    margin: 0;
    font-size: 13px;

    span {
      color: var(--muted);
    }

    a {
      margin-left: auto;
      font-weight: 700;
      text-decoration: none;
    }
  }

  .station {
    margin-top: 14px;

    > p {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
    }
  }

  .requirements {
    margin: 8px 0 0;
    padding: 0;
    list-style: none;

    > li {
      position: relative;

      &::before {
        position: absolute;
        top: 35px;
        left: -33px;
        width: 22px;
        height: 2px;
        background: color-mix(in srgb, var(--accent) 48%, var(--edge));
        content: '';
      }

      + li {
        border-top: 1px solid var(--edge);
      }
    }
  }

  .alternative {
    width: fit-content;
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 10px 0 0;

    span {
      color: var(--muted);
      font-size: 11px;
    }

    select {
      min-height: 36px;
      max-width: min(320px, 70vw);
      padding: 5px 30px 5px 9px;
      background: var(--surface);
      border: 1px solid var(--edge);
      font-size: 12px;
    }
  }
}

.branch-enter-active,
.branch-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.branch-enter-from,
.branch-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (max-width: 620px) {
  .craft {
    margin-left: 7px;
    padding-left: 20px;

    .requirements > li::before {
      left: -21px;
      width: 14px;
    }

    .instruction a {
      width: 100%;
      margin-left: 0;
    }
  }
}
</style>
