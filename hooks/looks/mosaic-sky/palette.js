import { makeColors } from '../../make-colors.js'

// A teletext night: deep navy grays, broadcast cyan accent, the other page colours as roles.
export const { theme, problems } = makeColors({
  label: 'Mosaic sky',
  only: 'dark',
  roles: { accent: '#46e2f2', danger: '#ff5a6e', success: '#4be37a', warning: '#f8d94a', pro: '#e07ae6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#070a2a',
        'surface-1': '#0b0f33',
        'surface-2': '#10153d',
        'surface-3': '#151b47',
        'text-primary': '#f1f3ff',
        'text-secondary': '#c9cfee',
        'text-muted': '#9ea6d6',
      },
    },
    git: { added: '#4be37a', removed: '#ff5a6e', modified: '#f8d94a', merged: '#e07ae6' },
  },
})
