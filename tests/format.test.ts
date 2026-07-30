import { describe, expect, it } from 'vitest'
import {
  parseMinecraftFormatting,
  stripMinecraftFormatting
} from '../app/utils/format'

describe('Minecraft legacy text formatting', () => {
  it('parses colors, accumulated styles and reset codes into safe segments', () => {
    expect(parseMinecraftFormatting(
      'Обычный §cКрасный §lжирный §nподчёркнутый§r конец'
    )).toEqual([
      { text: 'Обычный ', color: 'white' },
      { text: 'Красный ', color: 'red' },
      { text: 'жирный ', color: 'red', bold: true },
      { text: 'подчёркнутый', color: 'red', bold: true, underline: true },
      { text: ' конец', color: 'white' }
    ])
  })

  it('supports black and uppercase formatting codes', () => {
    expect(parseMinecraftFormatting('§0Чёрный §AЗелёный')).toEqual([
      { text: 'Чёрный ', color: 'black' },
      { text: 'Зелёный', color: 'green' }
    ])
  })

  it('provides unformatted text for search, metadata and accessibility', () => {
    expect(stripMinecraftFormatting('§cКнига §lадских уз§r')).toBe('Книга адских уз')
  })
})
