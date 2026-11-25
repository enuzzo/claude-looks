import { makeColors } from '../../make-colors.js'

// A flat night of ink and violet: ink-blue grays with a violet cast, a soft neon pink, a cold cyan.
export const { theme, problems } = makeColors({
  label: 'Luino',
  only: 'dark',
  roles: { accent: '#ff86c8', danger: '#ff6b85', success: '#6fe3c8', warning: '#ffcc8a', pro: '#86dcff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a0a1d',
        'surface-1': '#0d0e24',
        'surface-2': '#11122a',
        'surface-3': '#151631',
        'text-primary': '#eeecff',
        'text-secondary': '#c9c6ec',
        'text-muted': '#9c99c8',
      },
    },
    git: { added: '#6fe3c8', removed: '#ff6b85', modified: '#ffcc8a', merged: '#b9a4ff' },
  },
})

// The person's messages sit in a bubble of the night's violet ink, lit at the edge by the haze's pink;
// Claude's replies stay on the glass. Message colours go in after makeColors, which does not take them.
theme.inputs.dark['bg-user-message'] = '#1f183d'
theme.inputs.dark['text-user-message'] = '#f4eeff'
