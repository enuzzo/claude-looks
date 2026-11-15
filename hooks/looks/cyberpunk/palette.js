import { makeColors } from '../../make-colors.js'

// Rain-soaked megacity at night: cold blue-teal grays, electric cyan accent.
export const { theme, problems } = makeColors({
  label: 'Cyberpunk',
  only: 'dark',
  roles: { accent: '#00e5ff', danger: '#ff3b5c', success: '#3dff9e', warning: '#ffe11a', pro: '#ff2bd6' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#081217',
        'surface-1': '#0c181e',
        'surface-2': '#101d24',
        'surface-3': '#13222a',
        'text-primary': '#e8fbff',
        'text-secondary': '#b9d9e0',
        'text-muted': '#8cb1ba',
      },
    },
    git: { added: '#3dff9e', removed: '#ff3b5c', modified: '#ffe11a', merged: '#ff6be0' },
  },
})
