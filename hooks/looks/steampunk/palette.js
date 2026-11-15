import { makeColors } from '../../make-colors.js'

// Victorian brass-and-steam workshop: parchment by day, lamp-lit mahogany by night,
// copper accent, verdigris success, oxblood danger.
export const { theme, problems } = makeColors({
  label: 'Steampunk',
  roles: { accent: '#b8692c', danger: '#a3292f', success: '#3f9a7f', warning: '#b07612', pro: '#7d4f8c' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ebe1c9',
        'surface-1': '#f1e9d6',
        'surface-2': '#f8f3e6',
        'text-primary': '#2a1b0e',
        'text-secondary': '#563d25',
        'text-muted': '#6b5136',
      },
    },
    git: { added: '#3a7f67', removed: '#9a2a2e', modified: '#9a6a12', merged: '#7d4f8c' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1b110b',
        'surface-1': '#22160e',
        'surface-2': '#291b12',
        'surface-3': '#2b1d13',
        'text-primary': '#f6ead4',
        'text-secondary': '#dbc8a8',
        'text-muted': '#b59e7f',
      },
    },
    git: { added: '#5cc4a2', removed: '#e0626a', modified: '#e0ab45', merged: '#c294d4' },
  },
})
