export interface WikiNavigationLink {
  to: string
  label: string
  children?: WikiNavigationLink[]
}

export interface WikiNavigationSection {
  label: string
  links: WikiNavigationLink[]
}

export const wikiNavigation: WikiNavigationSection[] = [
  {
    label: 'Играть',
    links: [
      { to: '/start', label: 'Начало игры' },
      {
        to: '/progression',
        label: 'Путь прохождения',
        children: [
          { to: '/guides/first-day', label: 'Первые 20-40 минут' },
          { to: '/guides/early-game', label: 'Ранняя игра' },
          { to: '/guides/nether', label: 'Ад и благословения' },
          { to: '/guides/endgame', label: 'Энд и пост-Энд' }
        ]
      }
    ]
  },
  {
    label: 'Справочник',
    links: [
      { to: '/items', label: 'Предметы' },
      { to: '/recipes', label: 'Рецепты' },
      { to: '/traders', label: 'Торговцы' },
      {
        to: '/mechanics',
        label: 'Механики',
        children: [
          { to: '/mechanics/food', label: 'Еда и лечение' },
          { to: '/mechanics/death', label: 'Смерть и сердца' },
          { to: '/mechanics/equipment', label: 'Экипировка и сплавы' },
          { to: '/mechanics/enchanting', label: 'Благословения' },
          { to: '/mechanics/villagers', label: 'Жители и торговля' }
        ]
      },
      {
        to: '/world',
        label: 'Мир и добыча',
        children: [
          { to: '/locations', label: 'Места и находки' },
          { to: '/mobs', label: 'Мобы и добыча' },
          { to: '/world/fishing', label: 'Рыбалка' }
        ]
      }
    ]
  },
  {
    label: 'Оригинальный Matcha',
    links: [
      { to: '/philosophy', label: 'Зачем создан пак' },
      { to: '/about', label: 'Авторство и лицензия' },
      { to: '/vanilla-differences', label: 'Отличия от ванили' }
    ]
  },
  {
    label: 'Форк ArieX',
    links: [
      { to: '/fork', label: 'Русская версия' },
      { to: '/known-issues', label: 'Исправления и баги' }
    ]
  }
]
