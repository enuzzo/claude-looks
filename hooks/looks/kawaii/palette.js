import { makeColors } from '../../make-colors.js'

// Strawberry milk by day, a lavender-indigo night by moonlight: candy-pink accent, lavender pro, mint success.
export const { theme, problems } = makeColors({
  label: 'Kawaii',
  roles: { accent: '#ff5fa2', danger: '#e0304a', success: '#3fbf8f', warning: '#f0954a', pro: '#9b7bf0' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f7e6ee',
        'surface-1': '#fbeff4',
        'surface-2': '#fff8fb',
        'text-primary': '#3a2236',
        'text-secondary': '#5c4157',
        'text-muted': '#76596f',
      },
    },
    git: { added: '#2f9a6f', removed: '#d02a44', modified: '#c26a1e', merged: '#7a5ad6' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1d1834',
        'surface-1': '#221c3c',
        'surface-2': '#262042',
        'surface-3': '#292345',
        'text-primary': '#f6eeff',
        'text-secondary': '#d8cdee',
        'text-muted': '#ada2c8',
      },
    },
    git: { added: '#7fe0b8', removed: '#ff7088', modified: '#ffbf85', merged: '#c2adff' },
  },
})
