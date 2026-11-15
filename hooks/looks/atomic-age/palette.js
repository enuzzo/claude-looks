import { makeColors } from '../../make-colors.js'

// The world of tomorrow: cream paper and charcoal by day, teal-navy night and cream by night.
export const { theme, problems } = makeColors({
  label: 'Atomic age',
  roles: { accent: '#f2701e', danger: '#d42a52', success: '#3fbf8f', warning: '#d9a21b', pro: '#13a8a8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ece2cc',
        'surface-1': '#f3eadb',
        'surface-2': '#f9f4e9',
        'text-primary': '#272522',
        'text-secondary': '#4a463f',
        'text-muted': '#625b50',
      },
    },
    git: { added: '#2e9a6e', removed: '#c33a3c', modified: '#a87a0c', merged: '#12898a' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0d1e25',
        'surface-1': '#11252d',
        'surface-2': '#152a33',
        'surface-3': '#182e37',
        'text-primary': '#f7eedb',
        'text-secondary': '#dad0ba',
        'text-muted': '#a9aea2',
      },
    },
    git: { added: '#6fdcae', removed: '#ff7a6b', modified: '#f0c24a', merged: '#4fd0cc' },
  },
})
