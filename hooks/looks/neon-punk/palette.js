import { makeColors } from '../../make-colors.js'

// Neon tubes on a grimy back-alley wall: warm purple-gray grays, acid yellow-green
// accent, magenta pro.
export const { theme, problems } = makeColors({
  label: 'Neon punk',
  only: 'dark',
  roles: { accent: '#c8ff2e', danger: '#ff4a5a', success: '#4dffa0', warning: '#ffb02e', pro: '#ff3dd8' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#16121a',
        'surface-1': '#1c1721',
        'surface-2': '#221c28',
        'surface-3': '#26202d',
        'text-primary': '#f6f0f2',
        'text-secondary': '#d8cfd6',
        'text-muted': '#b3a8b3',
      },
    },
    git: { added: '#4dffa0', removed: '#ff4a5a', modified: '#ffb02e', merged: '#ff3dd8' },
  },
})
