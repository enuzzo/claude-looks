import { makeColors } from '../../make-colors.js'

// Moonlit sea drawn in glyphs: ink-blue grays with a teal cast, mint accent.
export const { theme, problems } = makeColors({
  label: 'ASCII tide',
  only: 'dark',
  roles: { accent: '#5cf2d6', danger: '#ff6b7a', success: '#9be86a', warning: '#ffc857', pro: '#9fa8ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#06121b',
        'surface-1': '#0a1822',
        'surface-2': '#0e1d28',
        'surface-3': '#11212d',
        'text-primary': '#e8fbf6',
        'text-secondary': '#bfdcd6',
        'text-muted': '#93b5b0',
      },
    },
    git: { added: '#9be86a', removed: '#ff6b7a', modified: '#ffc857', merged: '#9fa8ff' },
  },
})
