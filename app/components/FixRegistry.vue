<template>
  <div class="fix-registry">
    <p class="registry-summary">
      В исправленную редакцию вошло {{ totalFixes }} проверенных групп изменений.
      Каждая запись связана с точными файлами пака.
    </p>

    <section
      v-for="group in groups"
      :key="group.name"
      class="fix-group"
    >
      <header>
        <p class="eyebrow">{{ group.label }}</p>
        <h2>{{ group.name }}</h2>
        <p>{{ group.description }}</p>
      </header>

      <div class="fix-list">
        <details
          v-for="fix in group.fixes"
          :key="fix.id"
        >
          <summary>
            <span>
              <code>{{ fix.id }}</code>
              <strong>{{ fix.summary }}</strong>
            </span>
            <small>{{ fix.files.length }} {{ fileWord(fix.files.length) }}</small>
          </summary>
          <div class="fix-details">
            <p v-if="fix.evidenceType">
              Основание: {{ evidenceLabels[fix.evidenceType] ?? fix.evidenceType }}
            </p>
            <ul v-if="fix.evidence?.length">
              <li v-for="line in fix.evidence" :key="line">{{ line }}</li>
            </ul>
            <p>Изменённые файлы:</p>
            <ul class="file-list">
              <li v-for="file in fix.files" :key="file"><code>{{ file }}</code></li>
            </ul>
            <template v-if="fix.removedFiles?.length">
              <p>Удалённые устаревшие файлы:</p>
              <ul class="file-list">
                <li v-for="file in fix.removedFiles" :key="file"><code>{{ file }}</code></li>
              </ul>
            </template>
          </div>
        </details>
      </div>
    </section>

    <section v-if="deferred.length" class="fix-group deferred-group">
      <header>
        <p class="eyebrow">Не замаскировано под исправление</p>
        <h2>Подтверждённые ограничения</h2>
        <p>
          Причина известна, но безопасного исправления в текущем data-driven API
          нет. Эти записи остаются открытыми и видимыми.
        </p>
      </header>
      <div class="fix-list">
        <details v-for="entry in deferred" :key="entry.id">
          <summary>
            <span>
              <code>{{ entry.id }}</code>
              <strong>{{ entry.subject }}</strong>
            </span>
          </summary>
          <div class="fix-details">
            <ul>
              <li v-for="line in entry.evidence" :key="line">{{ line }}</li>
            </ul>
            <p><strong>Что потребуется:</strong> {{ entry.requiredCapability }}</p>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import coreManifest from '../../wiki-data/fixes/core.json'
import equipmentManifest from '../../wiki-data/fixes/equipment.json'
import foodManifest from '../../wiki-data/fixes/food.json'
import recipesManifest from '../../wiki-data/fixes/recipes.json'
import systemsManifest from '../../wiki-data/fixes/systems.json'

interface FixEntry {
  id: string
  summary: string
  files: string[]
  removedFiles?: string[]
  evidenceType?: string
  evidence?: string[]
}

interface DeferredEntry {
  id: string
  subject: string
  evidence: string[]
  requiredCapability: string
}

const groups = [
  {
    label: 'Загрузка и системная логика',
    name: 'Ядро пака',
    description: 'Рецепты, loot tables, достижения, рыбалка, спавн и ссылки ресурсов.',
    fixes: coreManifest.fixes as FixEntry[]
  },
  {
    label: 'Компоненты и эффекты',
    name: 'Еда',
    description: 'Лечение, Поглощение, совместимость стеков, локализация и multiplayer-аура.',
    fixes: foodManifest.fixes as FixEntry[]
  },
  {
    label: 'Атрибуты и владельцы эффектов',
    name: 'Экипировка',
    description: 'Боевые параметры, offhand-утечки, локализация и адресация зачарований.',
    fixes: equipmentManifest.fixes as FixEntry[]
  },
  {
    label: 'Таймеры, multiplayer и состояния',
    name: 'Игровые системы',
    description: 'Личные счётчики, обереги, смерть, сон, поверхность, движение и эффекты окружения.',
    fixes: systemsManifest.fixes as FixEntry[]
  },
  {
    label: 'Коллизии и книга рецептов',
    name: 'Рецепты',
    description: 'Дубли, пересечения с ванилью и нормализация pack-фильтра.',
    fixes: recipesManifest.fixes as FixEntry[]
  }
]

const deferred = equipmentManifest.deferred as DeferredEntry[]
const totalFixes = groups.reduce((total, group) => total + group.fixes.length, 0)

const evidenceLabels: Record<string, string> = {
  runtime_reload_log: 'журнал загрузки Minecraft 26.2',
  static_reference_graph: 'граф ссылок ресурсов',
  cross_file_invariant: 'согласованность нескольких игровых источников',
  command_semantics: 'семантика команд Minecraft',
  call_graph_and_selector_semantics: 'граф вызовов и селекторы',
  set_equality: 'полное совпадение наборов',
  asset_reference_graph: 'граф моделей и текстур',
  component_and_language_semantics: 'components и языковые ключи',
  attribute_formula_and_cross_file_invariant: 'формула атрибутов и варианты предмета',
  attribute_formula_and_tier_consistency: 'формула атрибутов и согласованность tier',
  carrier_defaults_and_attribute_formula: 'ванильные атрибуты carrier и итоговая формула',
  run_function_command_source_ownership: 'владелец command source в enchantment effect',
  multiplayer_scoreboard_ownership: 'личные scoreboard и одновременная игра',
  multiplayer_selector_ownership: 'селекторы и владелец состояния в multiplayer',
  tier_tag_consistency: 'согласованность tier-тегов инструментов',
  state_transition_runtime: 'переход состояния и живые сущности',
  enchantment_tick_cardinality: 'число enchantment callback за тик',
  entity_local_cooldown: 'личный cooldown сущности',
  tick_gate_semantics: 'семантика тиковых интервалов',
  continuous_charge_state_machine: 'автомат непрерывной зарядки',
  scheduled_context_ownership: 'владелец scheduled и тикового контекста',
  case_sensitive_asset_reference: 'ссылка ассета с учётом регистра',
  recipe_output_equivalence: 'эквивалентность выходов рецептов',
  vanilla_recipe_collision: 'коллизия с ванильным рецептом',
  pack_filter_set_invariant: 'уникальность фильтра pack.mcmeta'
}

function fileWord(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return 'файлов'
  if (last === 1) return 'файл'
  if (last >= 2 && last <= 4) return 'файла'
  return 'файлов'
}
</script>

<style scoped lang="scss">
.fix-registry {
  .registry-summary {
    margin: 0 0 52px;
    padding: 16px 18px;
    background: var(--surface-quiet);
    font-weight: 700;
  }

  .fix-group {
    margin-top: 58px;

    > header {
      max-width: 760px;
      margin-bottom: 22px;

      h2 {
        margin: 3px 0 10px;
      }

      > p:last-child {
        color: var(--muted);
      }
    }
  }

  .fix-list {
    border-bottom: 1px solid var(--edge);

    details {
      border-top: 1px solid var(--edge);
    }

    summary {
      min-height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 14px 4px;
      cursor: pointer;

      > span {
        min-width: 0;
        display: flex;
        align-items: baseline;
        gap: 12px;
      }

      code {
        flex: none;
        color: var(--accent);
        font-size: 11px;
      }

      strong {
        font-size: 14px;
        line-height: 1.45;
      }

      small {
        flex: none;
        color: var(--muted);
      }
    }
  }

  .fix-details {
    max-width: 900px;
    padding: 0 18px 24px 110px;
    color: var(--muted);

    ul {
      padding-left: 20px;
    }

    .file-list {
      margin-bottom: 0;

      code {
        overflow-wrap: anywhere;
        font-size: 11px;
      }
    }
  }

  .deferred-group {
    margin-bottom: 20px;
  }

  @media (max-width: 700px) {
    .fix-list {
      summary {
        align-items: flex-start;
        flex-direction: column;
        gap: 7px;

        > span {
          align-items: flex-start;
          flex-direction: column;
          gap: 5px;
        }
      }
    }

    .fix-details {
      padding-left: 4px;
    }
  }
}
</style>
