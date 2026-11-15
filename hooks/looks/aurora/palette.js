import { makeColors } from '../../make-colors.js'

// Polar night under the northern lights: blue-slate grays, aurora green accent.
export const { theme, problems } = makeColors({
  label: 'Aurora',
  only: 'dark',
  roles: { accent: '#3ff5a3', danger: '#ff6273', success: '#a8e65c', warning: '#ffc65c', pro: '#b48cff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a1020',
        'surface-1': '#0e1527',
        'surface-2': '#121a2e',
        'surface-3': '#151e34',
        'text-primary': '#eef3ff',
        'text-secondary': '#c4cee4',
        'text-muted': '#98a6c3',
      },
    },
    git: { added: '#a8e65c', removed: '#ff6273', modified: '#ffc65c', merged: '#b48cff' },
  },
})
