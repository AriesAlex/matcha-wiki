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
})
