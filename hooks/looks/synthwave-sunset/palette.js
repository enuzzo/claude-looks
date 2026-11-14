import { makeColors } from '../../make-colors.js'

// Night sky over a neon horizon: violet-tinted grays, hot pink accent.
export const { theme, problems } = makeColors({
  label: 'Synthwave sunset',
  only: 'dark',
  codeTheme: { dark: 'synthwave-84' },
  roles: { accent: '#ff2fa8', danger: '#ff4d5e', success: '#2ef2b3', warning: '#ffb13b', pro: '#a678ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#140a24',
        'surface-1': '#1a0e2f',
        'surface-2': '#201238',
        'surface-3': '#261640',
        'text-primary': '#f8ecff',
        'text-secondary': '#dcc6f0',
        'text-muted': '#b39bcf',
      },
    },
    git: { added: '#2ef2b3', removed: '#ff4d5e', modified: '#ffb13b', merged: '#c29bff' },
  },
})
