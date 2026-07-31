<template>
  <section class="article-section item-properties">
    <header class="section-heading">
      <p class="eyebrow">{{ hasOnlyEnchantments ? 'Чары' : 'Свойства' }}</p>
      <h2>{{ sectionTitle }}</h2>
    </header>

    <dl class="properties">
      <div
        v-for="enchantment in item.enchantments"
        :key="`${enchantment.id}:${enchantment.level}`"
      >
        <dt class="enchantment">
          <PhBookOpenText :size="18" aria-hidden="true" />
          <span>
            <strong>{{ enchantment.name }}</strong>
            <small v-if="enchantment.description">{{ enchantment.description }}</small>
          </span>
        </dt>
        <dd><strong>{{ formatEnchantmentLevel(enchantment.level) }}</strong></dd>
      </div>
      <div
        v-for="effect in item.effects"
        :key="`${effect.id}:${effect.level}:${effect.durationSeconds}`"
      >
        <dt :class="{ described: effect.description }">
          <PhSparkle :size="18" aria-hidden="true" />
          <span>
            <strong>{{ effect.name }} {{ effect.level > 1 ? effect.level : '' }}</strong>
            <small v-if="effect.description">{{ effect.description }}</small>
          </span>
        </dt>
        <dd>{{ effectDuration(effect.durationSeconds) }}</dd>
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
import { PhBookOpenText, PhSparkle } from '@phosphor-icons/vue'
import type { ItemView } from '../types/wiki'

const props = defineProps<{
  item: ItemView
}>()

const hasOnlyEnchantments = computed(() => (
  props.item.enchantments.length > 0
  && props.item.effects.length === 0
  && props.item.attributes.length === 0
))
const sectionTitle = computed(() => {
  if (!hasOnlyEnchantments.value) return 'Что даёт предмет'
  return props.item.carrier === 'minecraft:enchanted_book'
    ? 'Какие чары хранит книга'
    : 'Встроенные чары'
})

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

function formatEnchantmentLevel(level: number): string {
  const romanLevels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return romanLevels[level - 1] ?? String(level)
}

function effectDuration(durationSeconds: number | null): string {
  if (durationSeconds === null) return 'При использовании'
  if (durationSeconds === 0) return 'Мгновенно'
  return formatDuration(durationSeconds)
}

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

      &.enchantment,
      &.described {
        align-items: flex-start;

        > span {
          display: grid;
          gap: 4px;

          small {
            max-width: 560px;
            color: var(--muted);
            font-weight: 400;
            line-height: 1.45;
          }
        }
      }
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
