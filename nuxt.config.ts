import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface GeneratedRouteData {
  items?: Array<{ slug: string }>
  recipes?: Array<{ namespace: string, path: string }>
}

function generatedRoutes(): string[] {
  const catalogPath = resolve('generated/catalog.json')
  if (!existsSync(catalogPath)) {
    return []
  }

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as GeneratedRouteData
  return [
    ...(catalog.items ?? []).map(item => `/items/${item.slug}`),
    ...(catalog.recipes ?? []).map(recipe => `/recipes/${recipe.namespace}/${recipe.path}`)
  ]
}

export default defineNuxtConfig({
  compatibilityDate: '2026-07-15',
  future: {
    compatibilityVersion: 5
  },
  modules: [
    '@nuxt/content',
    '@nuxtjs/sitemap',
    '@nuxt/eslint'
  ],
  css: [
    '@fontsource-variable/onest/index.css',
    '@fontsource/tiny5/cyrillic-400.css',
    '~/assets/styles/main.scss'
  ],
  app: {
    head: {
      htmlAttrs: {
        lang: 'ru'
      },
      title: 'Matcha Wiki',
      titleTemplate: '%s · Matcha Wiki',
      meta: [
        {
          name: 'description',
          content: 'Русская энциклопедия и руководство по Matcha Flavoured для Minecraft 26.2.'
        },
        {
          name: 'theme-color',
          content: '#203529'
        }
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: `${process.env.NUXT_APP_BASE_URL ?? '/'}generated/ui/pack.png`
        }
      ]
    }
  },
  content: {
    renderer: {
      anchorLinks: {
        h2: true,
        h3: true,
        h4: true
      }
    }
  },
  nitro: {
    prerender: {
      // Nuxt otherwise uses CPU count × 4. Hundreds of catalog pages share
      // the same Content payloads, so that fan-out races atomic cache writes
      // on Windows and wastes work in CI.
      concurrency: 1,
      crawlLinks: true,
      failOnError: true,
      routes: [
        '/404.html',
        ...generatedRoutes()
      ]
    }
  },
  routeRules: {
    '/**': {
      prerender: true
    }
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL ?? 'https://ariesalex.github.io'
  },
  sitemap: {
    autoLastmod: true,
    zeroRuntime: true
  },
  typescript: {
    strict: true,
    typeCheck: true
  },
  devtools: {
    enabled: false
  }
})
