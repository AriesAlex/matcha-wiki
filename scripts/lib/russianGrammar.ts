export type RussianWordForms = readonly [
  singular: string,
  paucal: string,
  plural: string
]

export function russianWordForm(
  count: number,
  [singular, paucal, plural]: RussianWordForms
): string {
  const absolute = Math.abs(count)
  const lastTwoDigits = absolute % 100
  const lastDigit = absolute % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return plural
  if (lastDigit === 1) return singular
  if (lastDigit >= 2 && lastDigit <= 4) return paucal
  return plural
}
