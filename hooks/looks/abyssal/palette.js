import { makeColors } from '../../make-colors.js'

// Open water at the edge of the light: deep teal grays, sea-glass accent, coral-fan violet pro.
export const { theme, problems } = makeColors({
  label: 'Abyssal',
  only: 'dark',
  roles: { accent: '#2fd8c6', danger: '#ff5c7c', success: '#5fe08e', warning: '#ffbf57', pro: '#c58cff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#041820',
        'surface-1': '#071f28',
        'surface-2': '#08222b',
        'surface-3': '#09242e',
        'text-primary': '#e4fbf8',
        'text-secondary': '#bfe0dc',
        'text-muted': '#93b9b5',
      },
    },
    git: { added: '#5fe08e', removed: '#ff6f8a', modified: '#ffc45e', merged: '#a98cff' },
  },
})
