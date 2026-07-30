<template>
  <article
    :id="offer.anchor"
    class="offer"
  >
    <span class="visually-hidden">
      Сделка: отдать {{ costSummary }}, получить {{ resultSummary }}.
    </span>

    <div class="exchange">
      <div class="side">
        <span class="caption">Отдать</span>
        <div class="stacks">
          <template
            v-for="(cost, index) in offer.costs"
            :key="`${cost.stack.carrier}:${cost.title}:${index}`"
          >
            <PhPlus
              v-if="index"
              :size="16"
              aria-hidden="true"
            />
            <ItemStackReference
              :stack="cost.stack"
              :label="cost.title"
            />
          </template>
        </div>
      </div>

      <PhArrowRight
        class="arrow"
        :size="25"
        aria-hidden="true"
      />

      <div class="side">
        <span class="caption">Получить</span>
        <ItemStackReference
          :stack="offer.result.stack"
          :label="offer.result.title"
          :secondary="resultCount"
        />
      </div>
    </div>

    <ul
      v-if="usesLabel || offer.conditions.length || offer.details.length"
      class="notes"
      aria-label="Условия и свойства"
    >
      <li v-if="usesLabel">
        {{ usesLabel }}
      </li>
      <li
        v-for="condition in offer.conditions"
        :key="condition"
      >
        <PhMapPin :size="15" aria-hidden="true" />
        {{ condition }}
      </li>
      <li
        v-for="detail in offer.details"
        :key="detail"
      >
        <PhSparkle :size="15" aria-hidden="true" />
        {{ detail }}
      </li>
    </ul>

    <a
      class="permalink"
      :href="`#${offer.anchor}`"
      :aria-label="`Ссылка на сделку: ${offer.result.title}`"
      title="Ссылка на сделку"
    >
      <PhLinkSimple :size="18" aria-hidden="true" />
    </a>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhLinkSimple,
  PhMapPin,
  PhPlus,
  PhSparkle
} from '@phosphor-icons/vue'
import type { TradeOfferView } from '../../types/entities'

const props = defineProps<{
  offer: TradeOfferView
  restocks: boolean
}>()

const usesLabel = computed(() => {
  if (props.offer.maxUses >= 999) return ''
  if (props.offer.maxUses === 1) {
    return props.restocks ? 'Один обмен до пополнения' : 'Только один раз'
  }
  return props.restocks
    ? `До ${props.offer.maxUses} обменов до пополнения`
    : `До ${props.offer.maxUses} обменов, без пополнения`
})
const resultCount = computed(() => (
  props.offer.result.stack.count > 1
    ? `Количество: ${props.offer.result.stack.count}`
    : ''
))
const costSummary = computed(() => (
  props.offer.costs
    .map(cost => `${cost.stack.count} × ${stripMinecraftFormatting(cost.title)}`)
    .join(' и ')
))
const resultSummary = computed(() => (
  `${props.offer.result.stack.count} × ${stripMinecraftFormatting(props.offer.result.title)}`
))
</script>

<style scoped lang="scss">
.offer {
  position: relative;
  padding: 18px 0;
  scroll-margin-top: 92px;

  .exchange {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 28px minmax(220px, 1fr);
    align-items: center;
    gap: 20px;
    padding-right: 42px;
  }

  .side {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .caption {
    color: var(--muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .stacks {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .arrow {
    color: var(--muted);
  }

  .notes {
    display: flex;
    flex-wrap: wrap;
    gap: 7px 18px;
    margin: 12px 0 0;
    padding: 0;
    color: var(--muted);
    list-style: none;

    li {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
    }

    svg {
      color: var(--accent);
      flex: none;
    }
  }

  .permalink {
    position: absolute;
    top: 12px;
    right: 2px;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    color: var(--muted);
    text-decoration: none;
    opacity: 0;

    &:hover,
    &:focus-visible {
      color: var(--accent);
      opacity: 1;
    }
  }

  &:hover .permalink,
  &:focus-within .permalink,
  &:target .permalink {
    opacity: 1;
  }

  @media (max-width: 680px) {
    .exchange {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
    }

    .arrow {
      margin-left: 10px;
      transform: rotate(90deg);
    }
  }
}

@media (hover: none) {
  .offer .permalink {
    opacity: 0.65;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .offer {
    .arrow {
      transition: transform 140ms ease;
    }

    &:hover .arrow,
    &:focus-within .arrow {
      transform: translateX(3px);
    }

    .permalink {
      transition:
        color 120ms ease,
        opacity 120ms ease;
    }
  }
}

@media (max-width: 680px) and (prefers-reduced-motion: no-preference) {
  .offer:hover .arrow,
  .offer:focus-within .arrow {
    transform: rotate(90deg) translateX(3px);
  }
}
</style>
