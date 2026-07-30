<template>
  <details class="technical-details">
    <summary>
      <PhCaretRight :size="18" />
      Для авторов сборок и проверки
    </summary>

    <div class="content">
      <p>
        Служебные имена и файлы, по которым можно сверить сведения на этой странице.
      </p>

      <dl>
        <div>
          <dt>Служебное имя</dt>
          <dd><code>{{ item.id }}</code></dd>
        </div>
        <div>
          <dt>Предмет-основа</dt>
          <dd><code>{{ item.carrier }}</code></dd>
        </div>
        <div v-if="item.model">
          <dt>Модель ресурспака</dt>
          <dd><code>{{ item.model }}</code></dd>
        </div>
      </dl>

      <ul>
        <li
          v-for="source in item.sources"
          :key="`${source.kind}:${source.path}`"
        >
          <PhGitBranch :size="18" />
          <span>
            <strong>{{ source.label }}</strong>
            <code>{{ source.path }}</code>
          </span>
        </li>
      </ul>
    </div>
  </details>
</template>

<script setup lang="ts">
import { PhCaretRight, PhGitBranch } from '@phosphor-icons/vue'
import type { ItemView } from '../types/wiki'

defineProps<{
  item: ItemView
}>()
</script>

<style scoped lang="scss">
.technical-details {
  max-width: 880px;
  margin-top: 64px;

  summary {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    color: var(--muted);
    font-weight: 700;
    list-style: none;
    cursor: pointer;

    &::-webkit-details-marker {
      display: none;
    }

    svg {
      transition: transform 140ms ease;
    }
  }

  &[open] summary svg {
    transform: rotate(90deg);
  }

  .content {
    max-width: 820px;
    margin-top: 14px;
    padding: 18px 20px;
    background: var(--surface-quiet);

    > p {
      margin: 0 0 16px;
      color: var(--muted);
      font-size: 14px;
    }
  }

  dl {
    margin: 0 0 22px;

    div {
      display: grid;
      grid-template-columns: minmax(130px, 0.5fr) minmax(0, 1fr);
      gap: 16px;
      padding: 8px 0;

      + div {
        border-top: 1px solid var(--edge);
      }
    }

    dt {
      color: var(--muted);
      font-size: 13px;
    }

    dd {
      min-width: 0;
      margin: 0;
    }
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 10px;
      padding: 9px 0;

      + li {
        border-top: 1px solid var(--edge);
      }

      svg {
        margin-top: 3px;
        color: var(--accent);
      }

      span,
      code {
        display: block;
        min-width: 0;
      }

      code {
        margin-top: 2px;
        color: var(--muted);
        font-size: 12px;
      }
    }
  }
}

@media (max-width: 560px) {
  .technical-details {
    .content {
      padding: 16px;
    }

    dl div {
      display: block;

      dd {
        margin-top: 3px;
      }
    }
  }
}
</style>
