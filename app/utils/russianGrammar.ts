export function russianWordForm(
  count: number,
  forms: [string, string, string]
): string {
  const modulo100 = Math.abs(count) % 100
  const modulo10 = modulo100 % 10
  if (modulo100 >= 11 && modulo100 <= 19) return forms[2]
  if (modulo10 === 1) return forms[0]
  if (modulo10 >= 2 && modulo10 <= 4) return forms[1]
  return forms[2]
}
