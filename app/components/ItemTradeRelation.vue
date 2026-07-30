<template>
  <article class="trade-relation">
    <header>
      <NuxtLink
        class="trader"
        :to="relation.to || '/mechanics/villagers'"
      >
        <span
          class="trade-icon"
          aria-hidden="true"
        >
          <PhArrowsLeftRight :size="24" />
        </span>
        <span>
          <strong>{{ relation.context }}</strong>
          <small>{{ relation.contextDetail || 'Торговля' }}</small>
        </span>
      </NuxtLink>
    </header>

    <div
      class="exchange"
      :aria-label="relation.title"
    >
      <div class="side">
        <span class="caption">Отдать</span>
        <div class="stacks">
          <template
            v-for="(entry, index) in relation.cost"
            :key="`${entry.stack.carrier}:${entry.title}:${index}`"
          >
            <PhPlus
              v-if="index > 0"
              :size="16"
              aria-hidden="true"
            />
            <ItemStackReference
              :stack="entry.stack"
              :label="entry.title"
            />
          </template>
        </div>
      </div>

      <PhArrowRight
        class="exchange-arrow"
        :size="24"
        aria-hidden="true"
      />

      <div class="side result">
        <span class="caption">Получить</span>
        <ItemStackReference
          :stack="relation.result.stack"
          :label="relation.result.title"
        />
      </div>
    </div>

    <ul
      v-if="relation.details?.length"
      class="details"
      aria-label="Особенности сделки"
    >
      <li
        v-for="detail in relation.details"
        :key="detail"
      >
        <PhSparkle
          :size="15"
          aria-hidden="true"
        />
        {{ detail }}
      </li>
    </ul>
  </article>
</template>

<script setup lang="ts">
import {
  PhArrowRight,
  PhArrowsLeftRight,
  PhPlus,
  PhSparkle
} from '@phosphor-icons/vue'
import type {
  ItemRelationStackView,
  ItemRelationView
} from '../types/wiki'

defineProps<{
  relation: ItemRelationView & {
    context: string
    cost: ItemRelationStackView[]
    result: ItemRelationStackView
  }
}>()
</script>

<style scoped lang="scss">
.trade-relation {
  display: grid;
  grid-template-columns: minmax(145px, 0.65fr) minmax(320px, 1.35fr);
  gap: 12px 28px;
  padding: 16px 0;

  header {
    min-width: 0;
  }

  .trader {
    display: inline-grid;
    grid-template-columns: 38px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    color: inherit;
    text-decoration: none;

    &:hover strong,
    &:focus-visible strong {
      color: var(--accent);
    }

    span:last-child {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    strong {
      transition: color 120ms ease;
    }

    small {
      color: var(--muted);
      font-size: 12px;
    }
  }

  .trade-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    color: var(--accent);
    background: var(--surface-quiet);
  }

  .exchange {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
  }

  .side {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;

    &.result {
      padding-left: 4px;
    }
  }

  .caption {
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .stacks {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .exchange-arrow {
    color: var(--muted);
  }

  .details {
    grid-column: 2;
    display: flex;
    flex-wrap: wrap;
    gap: 7px 16px;
    margin: 0;
    padding: 0;
    color: var(--muted);
    list-style: none;

    li {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
    }

    svg {
      color: var(--accent);
    }
  }
}

@media (max-width: 720px) {
  .trade-relation {
    grid-template-columns: 1fr;
    gap: 16px;

    .details {
      grid-column: 1;
    }
  }
}

@media (max-width: 480px) {
  .trade-relation {
    .exchange {
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .side.result {
      padding-left: 0;
    }

    .exchange-arrow {
      margin-left: 10px;
      transform: rotate(90deg);
    }
  }
}
</style>
