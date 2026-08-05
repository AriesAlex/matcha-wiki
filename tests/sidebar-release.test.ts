import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Russian fork entry point', () => {
  it('appears before the long wiki navigation', () => {
    const sidebar = readFileSync(resolve(
      import.meta.dirname,
      '../app/components/WikiSidebar.vue'
    ), 'utf8')

    expect(sidebar.indexOf('<WikiSidebarRelease')).toBeGreaterThan(-1)
    expect(sidebar.indexOf('<WikiSidebarRelease'))
      .toBeLessThan(sidebar.indexOf('<WikiSidebarNavigation'))
  })

  it('explains the fork and exposes the download directly', () => {
    const release = readFileSync(resolve(
      import.meta.dirname,
      '../app/components/WikiSidebarRelease.vue'
    ), 'utf8')

    expect(release).toContain('Форк Matcha от ArieX')
    expect(release).toContain('Ручная локализация и исправления')
    expect(release).toContain('Скачать ZIP')
    expect(release).toContain('Что изменено')
  })
})
