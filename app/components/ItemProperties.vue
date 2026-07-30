<template>
  <section class="article-section item-properties">
    <header class="section-heading">
      <p class="eyebrow">Свойства</p>
      <h2>Что даёт предмет</h2>
    </header>

    <dl class="properties">
      <div
        v-for="effect in item.effects"
        :key="`${effect.id}:${effect.level}:${effect.durationSeconds}`"
      >
        <dt>
          <PhSparkle :size="18" aria-hidden="true" />
          {{ effect.name }} {{ effect.level > 1 ? effect.level : '' }}
        </dt>
        <dd>{{ formatDuration(effect.durationSeconds) }}</dd>
      </div>
      <div
        v-for="attribute in item.attributes"
        :key="`${attribute.id}:${attribute.slot}`"
      >
        <dt>{{ attributeNames[attribute.id] ?? attribute.name }}</dt>
        <dd>
          <strong>{{ formatAttributeValue(attribute.id, attribute.amount) }}</strong>
          <small v-if="attribute.slot && slotNames[attribute.slot]">
            {{ slotNames[attribute.slot] }}
          </small>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { PhSparkle } from '@phosphor-icons/vue'
import type { ItemView } from '../types/wiki'

defineProps<{
  item: ItemView
}>()

const attributeNames: Record<string, string> = {
  'minecraft:armor': 'Броня',
  'minecraft:armor_toughness': 'Твёрдость брони',
  'minecraft:attack_damage': 'Урон',
  'minecraft:attack_knockback': 'Отбрасывание при ударе',
  'minecraft:attack_speed': 'Скорость атаки',
  'minecraft:entity_interaction_range': 'Дальность взаимодействия',
  'minecraft:knockback_resistance': 'Сопротивление отбрасыванию',
  'minecraft:movement_speed': 'Скорость передвижения',
  'minecraft:safe_fall_distance': 'Безопасная высота падения'
}

const slotNames: Record<string, string> = {
  mainhand: 'В ведущей руке',
  offhand: 'Во второй руке',
  feet: 'На ногах',
  legs: 'На поножах',
  chest: 'На нагруднике',
  head: 'На голове'
}

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 3
})

function formatAttributeValue(id: string, amount: number): string {
  let playerValue = amount
  if (id === 'minecraft:attack_damage') playerValue += 1
  if (id === 'minecraft:attack_speed') playerValue += 4

  const formatted = numberFormatter.format(playerValue)

  if (id === 'minecraft:attack_damage' || id === 'minecraft:attack_speed') {
    return formatted
  }
  return playerValue > 0 ? `+${formatted}` : formatted
}
</script>

<style scoped lang="scss">
.item-properties {
  max-width: 720px;

  .properties {
    margin: 0;

    > div {
      min-height: 54px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 10px 0;

      + div {
        border-top: 1px solid var(--edge);
      }
    }

    dt {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
    }

    dd {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin: 0;
      text-align: right;

      strong {
        font-family: 'Cascadia Mono', monospace;
      }

      small {
        color: var(--muted);
      }
    }
  }
}

@media (max-width: 520px) {
  .item-properties {
    .properties {
      > div {
        align-items: flex-start;
        flex-direction: column;
        gap: 4px;
      }

      dd {
        text-align: left;
      }
    }
  }
}
</style>
