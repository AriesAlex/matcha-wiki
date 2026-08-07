export const SITE_NAME = 'Matcha Wiki'
export const SITE_DESCRIPTION = 'Русская вики Matcha Flavoured: скачать ручной перевод, найти рецепты, предметы, механики и подробное прохождение.'
export const SITE_IMAGE_PATH = '/generated/ui/pack.png'

export function releaseDownloadUrl(artifactName: string, version: string): string {
  const versionSegment = version.replaceAll('.', '_')
  const fileName = `${artifactName}_${versionSegment}_RU.zip`

  return `https://github.com/AriesAlex/matcha-wiki/releases/latest/download/${fileName}`
}

export function canonicalWikiUrl(siteUrl: string, path = '/'): string {
  const baseUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`
  return new URL(path.replace(/^\/+/, ''), baseUrl).toString()
}
