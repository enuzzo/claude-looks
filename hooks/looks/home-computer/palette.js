import { makeColors } from '../../make-colors.js'

// An 8-bit home computer's boot screen: blue-violet grays, light blue accent,
// roles from that era's sixteen-color palette.
export const { theme, problems } = makeColors({
  label: 'Home computer',
  only: 'dark',
  roles: { accent: '#8fb4ff', danger: '#ff6f6f', success: '#8ce07a', warning: '#f2d86a', pro: '#c58cf2' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1e1752',
        'surface-1': '#221a5b',
        'surface-2': '#261d63',
        'surface-3': '#281f68',
        'text-primary': '#f0edff',
        'text-secondary': '#d6d0fb',
        'text-muted': '#b5acf0',
      },
    },
    git: { added: '#8ce07a', removed: '#ff6f6f', modified: '#f2d86a', merged: '#c58cf2' },
  },
})
