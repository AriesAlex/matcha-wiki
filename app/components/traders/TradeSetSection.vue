<template>
  <section
    class="trade-set"
    :aria-labelledby="set.anchor"
  >
    <header>
      <div>
        <p class="eyebrow">
          {{ set.level ? `${set.level}-й уровень` : 'Случайный набор' }}
        </p>
        <WikiHeading
          :id="set.anchor"
          :level="2"
        >
          {{ set.title }}
        </WikiHeading>
        <p v-if="selectionNote">{{ selectionNote }}</p>
      </div>
    </header>

    <div v-if="set.offers.length" class="offers">
      <TraderOfferExchange
        v-for="offer in set.offers"
        :key="offer.id"
        :offer="offer"
        :restocks="restocks"
      />
    </div>
    <p v-else class="empty">
      На этом уровне полезных сделок пока нет.
    </p>
  </section>
</template>

<script setup lang="ts">
import TraderOfferExchange from './TraderOfferExchange.vue'
import type { TradeSetView } from '../../types/entities'
import { tradeSetSelectionNote } from '../../utils/tradeSetPresentation'

const props = defineProps<{
  set: TradeSetView
  restocks: boolean
}>()

const selectionNote = computed(() => tradeSetSelectionNote(props.set))
</script>

<style scoped lang="scss">
.trade-set {
  scroll-margin-top: 96px;
  margin-top: 58px;

  > header {
    margin-bottom: 12px;

    .eyebrow {
      margin: 0 0 6px;
    }

    :deep(.wiki-heading) {
      font-size: clamp(1.4rem, 3vw, 2rem);
    }

    p {
      max-width: 660px;
      margin: 9px 0 0;
      color: var(--muted);
    }
  }

  .offers {
    max-width: 980px;
    margin: 0;

    > :deep(.offer + .offer) {
      border-top: 1px solid var(--edge);
    }
  }

  .empty {
    max-width: 720px;
    margin: 20px 0 0;
    padding: 18px 20px;
    color: var(--muted);
    background: var(--surface-quiet);
  }
}
</style>
