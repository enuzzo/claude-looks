import { makeColors } from '../../make-colors.js'

// A motorway LED panel at night: warm near-black grays, amber accent, signal-lamp roles.
export const { theme, problems } = makeColors({
  label: 'Dot matrix',
  only: 'dark',
  roles: { accent: '#ffa424', danger: '#ff4a36', success: '#4dff86', warning: '#ffd23f', pro: '#c9a2ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0b0806',
        'surface-1': '#110d0a',
        'surface-2': '#17120e',
        'surface-3': '#1d1712',
        'text-primary': '#fff4e4',
        'text-secondary': '#e2d2bd',
        'text-muted': '#b8a58e',
      },
    },
    git: { added: '#4dff86', removed: '#ff4a36', modified: '#ffd23f', merged: '#c9a2ff' },
  },
})
