import { makeColors } from '../../make-colors.js'

// A home computer loading from tape at night: deep blue-violet grays, the light blue of its
// horizon line as the accent, roles from that era's sixteen-colour palette.
export const { theme, problems } = makeColors({
  label: 'Home computer',
  only: 'dark',
  roles: { accent: '#8fb4ff', danger: '#ff6f6f', success: '#8ce07a', warning: '#f2d86a', pro: '#c58cf2' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#110d2e',
        'surface-1': '#151036',
        'surface-2': '#17123b',
        'surface-3': '#19143f',
        'text-primary': '#f0edff',
        'text-secondary': '#d6d0fb',
        'text-muted': '#b5acf0',
      },
    },
    git: { added: '#8ce07a', removed: '#ff6f6f', modified: '#f2d86a', merged: '#c58cf2' },
  },
})
