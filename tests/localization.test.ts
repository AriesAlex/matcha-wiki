import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertAudit,
  auditPackLocalization
} from '../scripts/localize-pack-text'

describe('pack localization contract', () => {
  it('keeps every safe UI surface translated and every deferred literal inventoried', () => {
    const audit = auditPackLocalization()

    expect(audit.registryEntries).toBe(145)
    expect(audit.deferredEntries).toBe(939)
    expect(audit.translatableLiterals).toEqual([])
    expect(audit.unresolvedKeys).toEqual([])
    expect(audit.staleInventory).toBe(false)
    expect(() => assertAudit(audit)).not.toThrow()
  })

  it('keeps the active weaponsmith placeholder honest and Russian', () => {
    const path = resolve(
      import.meta.dirname,
      '../pack/data/minecraft/villager_trade/weaponsmith/1/iou.json'
    )
    const trade = JSON.parse(readFileSync(path, 'utf8'))
    const components = trade.gives.components

    expect(components['minecraft:item_name']).toBe('Записка оружейника')
    expect(
      components['minecraft:writable_book_content'].pages[0].raw
    ).toBe(
      'Это временная заглушка: полезные сделки для оружейника ещё не придуманы. '
      + 'Готовое оружие и инструменты он намеренно не продаёт — '
      + 'их предлагается создавать самостоятельно.'
    )
    expect(JSON.stringify(trade)).not.toContain("I don't have any good ideas")
  })
})
