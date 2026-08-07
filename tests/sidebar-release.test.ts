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

    expect(release).toContain('Русская Matcha')
    expect(release).toContain('Ручной перевод и исправления')
    expect(release).toContain('Скачать')
    expect(release).toContain('Что переведено')
    expect(release).toContain(':href="downloadUrl"')
  })

  it('puts the download before secondary content on the home and fork pages', () => {
    const rootDir = resolve(import.meta.dirname, '..')
    const home = readFileSync(resolve(rootDir, 'app/pages/index.vue'), 'utf8')
    const fork = readFileSync(resolve(rootDir, 'content/wiki/fork.md'), 'utf8')

    expect(home).toContain('class="home-download"')
    expect(home).toContain('Скачать русскую Matcha')
    expect(home).toContain(':href="downloadUrl"')
    expect(fork).toContain('<ForkDownloadCta></ForkDownloadCta>')
    expect(fork.indexOf('<ForkDownloadCta>'))
      .toBeLessThan(fork.indexOf('## Что входит'))
    expect(fork).not.toContain('SHA-256')
  })
})
