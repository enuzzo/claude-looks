import { makeColors } from '../../make-colors.js'

// A koi pond from above: sunlit jade water by day, moonlit ink-teal by night, koi orange-red accent.
export const { theme, problems } = makeColors({
  label: 'Koi script',
  roles: { accent: '#e8542c', danger: '#d1304f', success: '#2f9a68', warning: '#e0a21c', pro: '#5a6fd0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#d5eae3',
        'surface-1': '#e2f1ec',
        'surface-2': '#eef8f4',
        'text-primary': '#0e2a29',
        'text-secondary': '#2a4746',
        'text-muted': '#445f5d',
      },
    },
    git: { added: '#2b8a55', removed: '#c4323f', modified: '#a87408', merged: '#4a5fc0' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a1a1c',
        'surface-1': '#0e2124',
        'surface-2': '#112629',
        'surface-3': '#142a2d',
        'text-primary': '#ecf6f1',
        'text-secondary': '#c4dad4',
        'text-muted': '#98b4ae',
      },
    },
    git: { added: '#6fd39a', removed: '#ff7a86', modified: '#ffc857', merged: '#9aa8ff' },
  },
})
