import { makeColors } from '../../make-colors.js'

// Raked sand and sumi ink by day; a moonlit garden of stone gray and soft cream by night.
export const { theme, problems } = makeColors({
  label: 'Zen garden',
  roles: { accent: '#6f8a2e', danger: '#a8302a', success: '#3b8a66', warning: '#b8862a', pro: '#6a6aa6' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e7e1d3',
        'surface-1': '#eee9de',
        'surface-2': '#f6f2ea',
        'text-primary': '#1d1b18',
        'text-secondary': '#433f39',
        'text-muted': '#5d5850',
      },
    },
    git: { added: '#4d7a2c', removed: '#a8302a', modified: '#9a6c14', merged: '#5a5a9a' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#191b1a',
        'surface-1': '#1e201f',
        'surface-2': '#222524',
        'surface-3': '#252827',
        'text-primary': '#eee8db',
        'text-secondary': '#cec7b8',
        'text-muted': '#a39e92',
      },
    },
    git: { added: '#9ab86a', removed: '#e0675c', modified: '#d8ad5a', merged: '#a4a4dc' },
  },
})
