import { defineCollection, defineContentConfig, z } from '@nuxt/content'

const wikiSchema = z.object({
  category: z.enum([
    'Начало игры',
    'Прогрессия',
    'Механики',
    'Исследование',
    'Справочник',
    'О проекте'
  ]),
  order: z.number(),
  related: z.array(z.string()).default([]),
  sourcePaths: z.array(z.string()).default([])
})

export default defineContentConfig({
  collections: {
    wiki: defineCollection({
      type: 'page',
      source: {
        include: 'wiki/**/*.md',
        prefix: '/'
      },
      schema: wikiSchema,
      indexes: [
        { columns: ['category'] },
        { columns: ['order'] }
      ]
    })
  }
})
