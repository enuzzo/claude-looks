import { makeColors } from '../../make-colors.js'

// The deep sea at night: navy-indigo grays, bioluminescent cyan-teal accent, violet pro.
export const { theme, problems } = makeColors({
  label: 'Abyssal',
  only: 'dark',
  roles: { accent: '#2fd8c6', danger: '#ff5c7c', success: '#5fe08e', warning: '#ffbf57', pro: '#9d80ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#070a1a',
        'surface-1': '#0e132b',
        'surface-2': '#10162f',
        'surface-3': '#121832',
        'text-primary': '#e9ecff',
        'text-secondary': '#c3c8e9',
        'text-muted': '#99a0c9',
      },
    },
    git: { added: '#5fe08e', removed: '#ff6f8a', modified: '#ffc45e', merged: '#a98cff' },
  },
})
