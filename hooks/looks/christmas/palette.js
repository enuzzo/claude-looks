import { makeColors } from '../../make-colors.js'

// A snowy night: deep navy grays like the sky behind the falling snow, candy-cane red accent, pine green
// success, the amber of lit windows for warnings, fairy-light violet pro.
export const { theme, problems } = makeColors({
  label: 'Christmas',
  only: 'dark',
  roles: { accent: '#ff4d5e', danger: '#ff6b7a', success: '#5fd88a', warning: '#ffc25a', pro: '#c49cff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#040c18',
        'surface-1': '#071222',
        'surface-2': '#0a1628',
        'surface-3': '#0d1a2e',
        'text-primary': '#eef4ff',
        'text-secondary': '#c3d0e6',
        'text-muted': '#93a3be',
      },
    },
    git: { added: '#5fd88a', removed: '#ff6b7a', modified: '#ffc25a', merged: '#b39cff' },
  },
})
