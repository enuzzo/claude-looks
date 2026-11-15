import { makeColors } from '../../make-colors.js'

// Green-phosphor glyphs falling on near-black: green-tinted grays, bright green accent.
export const { theme, problems } = makeColors({
  label: 'Digital rain',
  only: 'dark',
  roles: { accent: '#3dff7a', danger: '#e0605a', success: '#7dffa8', warning: '#e8b440', pro: '#7fd6c2' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#050c07',
        'surface-1': '#09140c',
        'surface-2': '#0d1a10',
        'surface-3': '#102014',
        'text-primary': '#e4ffe9',
        'text-secondary': '#b5e8c0',
        'text-muted': '#86c494',
      },
    },
    git: { added: '#7dffa8', removed: '#e0605a', modified: '#e8b440', merged: '#7fd6c2' },
  },
})
