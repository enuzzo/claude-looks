import { makeColors } from '../../make-colors.js'

// A hopeful green future: sunlit leaf-paper by day, warm green dusk with fireflies by night.
export const { theme, problems } = makeColors({
  label: 'Solarpunk',
  roles: { accent: '#4f9a1c', danger: '#cc4433', success: '#239a62', warning: '#e8a314', pro: '#1d93b3' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e6eddb',
        'surface-1': '#eef3e5',
        'surface-2': '#f6f9f0',
        'text-primary': '#132b1a',
        'text-secondary': '#2c4733',
        'text-muted': '#465f4b',
      },
    },
    git: { added: '#2c8a3c', removed: '#c03b2c', modified: '#b07a08', merged: '#1d7f9c' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#131c14',
        'surface-1': '#182319',
        'surface-2': '#1c291d',
        'surface-3': '#1f2d20',
        'text-primary': '#eef5e2',
        'text-secondary': '#cbdbbf',
        'text-muted': '#a2b897',
      },
    },
    git: { added: '#7fd36a', removed: '#ff7a66', modified: '#f2c14e', merged: '#6cc7e0' },
  },
})
