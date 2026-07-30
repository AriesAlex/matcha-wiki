<template>
  <div class="loot-list">
    <AcquisitionLootRows :groups="directGroups" />

    <details
      v-if="fishingTableGroups.length"
      class="loot-branch"
    >
      <summary>
        Дополнительные трофеи
        <small>{{ fishingTableRollsLabel }}</small>
      </summary>
      <p>
        После победы игра делает {{ fishingTableRollsLabel }} по таблице
        рыбалки. Удочка не нужна. Результат каждого броска зависит от
        биома, где погиб моб, поэтому длинный список спрятан.
      </p>
      <AcquisitionLootRows :groups="fishingTableGroups" />
    </details>

    <details
      v-if="fishingGroups.length"
      class="loot-branch"
    >
      <summary>
        Рыбалка по биому
        <small>
          {{ fishingGroups.length }}
          {{ russianWordForm(fishingGroups.length, ['вид', 'вида', 'видов']) }}
        </small>
      </summary>
      <p>
        Эти предметы игрок получает удочкой. Конкретный улов зависит
        от биома, поэтому длинный список спрятан.
      </p>
      <AcquisitionLootRows :groups="fishingGroups" />
    </details>
  </div>
</template>

<script setup lang="ts">
import type {
  AcquisitionMethod,
  AcquisitionTarget
} from '../../types/acquisition'
import { russianWordForm } from '../../utils/russianGrammar'

const props = defineProps<{
  methods: AcquisitionMethod[]
  targets: AcquisitionTarget[]
}>()

const targetById = computed(() => new Map(
  props.targets.map(target => [target.id, target])
))
const directGroups = computed(() => groupMethods(
  props.methods.filter(method => !method.channel)
))
const fishingGroups = computed(() => groupMethods(
  props.methods.filter(method => method.channel === 'fishing')
))
const fishingTableMethods = computed(() => (
  props.methods.filter(method => method.channel === 'fishing_table')
))
const fishingTableGroups = computed(() => groupMethods(
  fishingTableMethods.value
))
const fishingTableRollsLabel = computed(() => {
  const [rolls] = fishingTableMethods.value.flatMap(method => (
    method.rolls ? [method.rolls] : []
  ))
  if (
    !rolls
    || fishingTableMethods.value.some((method) => {
      const methodRolls = method.rolls
      return !methodRolls
        || methodRolls.min !== rolls.min
        || methodRolls.max !== rolls.max
    })
  ) return 'несколько бросков'

  if (rolls.min !== rolls.max) {
    return `${rolls.min}–${rolls.max} бросков`
  }
  return `${rolls.min} ${russianWordForm(
    rolls.min,
    ['бросок', 'броска', 'бросков']
  )}`
})

function groupMethods(methods: AcquisitionMethod[]): Array<{
  target: AcquisitionTarget
  methods: AcquisitionMethod[]
}> {
  const grouped = new Map<string, {
    target: AcquisitionTarget
    methods: AcquisitionMethod[]
  }>()

  for (const method of methods) {
    const target = targetById.value.get(method.targetId)
    if (!target) continue

    const group = grouped.get(target.id)
    if (group) {
      group.methods.push(method)
    } else {
      grouped.set(target.id, { target, methods: [method] })
    }
  }

  return [...grouped.values()]
    .sort((left, right) => (
      left.target.stack.name.localeCompare(right.target.stack.name, 'ru')
    ))
}
</script>

<style scoped lang="scss">
.loot-list {
  .loot-branch {
    max-width: 920px;
    margin-top: 24px;
    padding: 16px 0 0;
    border-top: 1px solid var(--edge);

    summary {
      width: fit-content;
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--ink);
      font-weight: 800;
      cursor: pointer;

      small {
        color: var(--accent);
        font-family: 'Tiny5', monospace;
        font-size: 16px;
        font-weight: 400;
      }
    }

    > p {
      max-width: 680px;
      margin: 4px 0 12px;
      color: var(--muted);
      font-size: 14px;
    }

    &[open] {
      summary {
        margin-bottom: 4px;
      }
    }
  }
}
</style>
