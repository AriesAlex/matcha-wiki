import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readAcquisitionGuides } from '../scripts/lib/acquisition/sourceGuides'

const rootDir = resolve(import.meta.dirname, '..')
const guides = readAcquisitionGuides(
  resolve(rootDir, 'wiki-data/source-guides.ru.json')
)
const mobChanges = readFileSync(
  resolve(
    rootDir,
    'pack/data/main/function/mechanic/spawn_mechanic/modify_mob.mcfunction'
  ),
  'utf8'
)
const hungerManagement = readFileSync(
  resolve(rootDir, 'pack/data/main/function/mechanic/manage_hunger.mcfunction'),
  'utf8'
)

function guideText(entityId: string): string {
  const guide = guides.mobs[entityId]
  if (!guide) {
    throw new Error(`Нет описания моба ${entityId}`)
  }
  return `${guide.summary} ${guide.action}`
}

describe('player-facing mob source guides', () => {
  it('warns that adult regular zombies are fast and climb one-block ledges', () => {
    expect(mobChanges).toContain(
      'type=minecraft:zombie,nbt={IsBaby:0b}] run attribute @s minecraft:movement_speed base set 0.4'
    )
    expect(mobChanges).toContain(
      'type=#minecraft:zombies,nbt={IsBaby:0b}] run attribute @s minecraft:step_height base set 1'
    )

    const text = guideText('minecraft:zombie')
    expect(text).toMatch(/быстр/)
    expect(text).toMatch(/уступ|выше одного блока/)
    expect(text).not.toMatch(/медлен/)
  })

  it('describes the husk as a heavy hitter without treating hunger as a threat', () => {
    expect(mobChanges).toContain(
      'type=minecraft:husk,nbt={IsBaby:0b}] run attribute @s minecraft:movement_speed base set 0.28'
    )
    expect(mobChanges).toContain(
      'type=minecraft:husk,nbt={IsBaby:0b}] run attribute @s minecraft:attack_damage base set 7'
    )
    expect(hungerManagement).toContain(
      '@a[scores={Hunger=..6}] run effect give @s minecraft:saturation'
    )

    const text = guideText('minecraft:husk')
    expect(text).toMatch(/медленнее/)
    expect(text).toMatch(/урон|ударами/)
    expect(text).not.toMatch(/голод/)
  })

  it('explains the reduced health of skeleton variants covered by the pack', () => {
    expect(mobChanges).toContain(
      'type=#minecraft:skeletons] run attribute @s minecraft:max_health base set 10'
    )

    for (const entityId of [
      'minecraft:bogged',
      'minecraft:skeleton',
      'minecraft:wither_skeleton'
    ]) {
      expect(guideText(entityId)).toMatch(/уменьшенн|меньше здоровья|хрупк/)
    }
  })
})
