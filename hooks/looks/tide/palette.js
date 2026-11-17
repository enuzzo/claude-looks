import { makeColors } from '../../make-colors.js'

// A night sea set in type: ink-indigo grays, moon-white text, the mint of a falling star as accent.
export const { theme, problems } = makeColors({
  label: 'Tide',
  only: 'dark',
  roles: { accent: '#5cf2d6', danger: '#ff6b7a', success: '#9be86a', warning: '#ffc857', pro: '#9fa8ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#070a17',
        'surface-1': '#0d1122',
        'surface-2': '#11162b',
        'surface-3': '#161c35',
        'text-primary': '#f0f4ff',
        'text-secondary': '#ccd4ee',
        'text-muted': '#a8b3d6',
      },
    },
    git: { added: '#9be86a', removed: '#ff6b7a', modified: '#ffc857', merged: '#9fa8ff' },
  },
})
