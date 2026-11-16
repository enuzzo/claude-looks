import { makeColors } from '../../make-colors.js'

const roles = { accent: '#f0795c', danger: '#ff5a78', success: '#7fd6a0', warning: '#f2c46b', pro: '#a9a4ff' }
const git = { added: '#7fd6a0', removed: '#ff7088', modified: '#f2c46b', merged: '#a9a4ff' }

// A koi pond at night: ink-teal water going to indigo, bone-white text, the vermilion of a koi as accent.
export const { theme, problems } = makeColors({
  label: 'Koi script',
  only: 'dark',
  roles,
  dark: {
    gray: {
      anchors: {
        'surface-0': '#07141c',
        'surface-1': '#0b1b25',
        'surface-2': '#0e202b',
        'surface-3': '#112531',
        'text-primary': '#f3eee2',
        'text-secondary': '#cdd6d2',
        'text-muted': '#9fb3b4',
      },
    },
    git,
  },
})

// The same pond by day: muted jade water, still dark enough to sit behind code.
export const { theme: dayTheme, problems: dayProblems } = makeColors({
  label: 'Koi script (day)',
  only: 'dark',
  roles,
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a201e',
        'surface-1': '#0d2522',
        'surface-2': '#0f2926',
        'surface-3': '#112d2a',
        'text-primary': '#f6f1e4',
        'text-secondary': '#d3dcd0',
        'text-muted': '#a6bcae',
      },
    },
    git,
  },
})
