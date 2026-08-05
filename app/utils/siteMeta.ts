export const SITE_NAME = 'Matcha Wiki'
export const SITE_DESCRIPTION = 'Русская вики-энциклопедия Matcha Flavoured: предметы, рецепты, механики, прохождение и исправленный форк.'
export const SITE_IMAGE_PATH = '/generated/ui/pack.png'

export function canonicalWikiUrl(siteUrl: string, path = '/'): string {
  const baseUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`
  return new URL(path.replace(/^\/+/, ''), baseUrl).toString()
}
