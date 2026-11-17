import { makeColors } from '../../make-colors.js'

// An 8-bit home computer of the C64 kind at night: the screen's blue taken down for hours of work,
// its light-blue type as the accent, the other roles from its sixteen colours, lifted to read.
export const { theme, problems } = makeColors({
  label: 'Home computer',
  only: 'dark',
  roles: { accent: '#9895ff', danger: '#f0959a', success: '#a9ff9f', warning: '#edf171', pro: '#d39be0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#16144f',
        'surface-1': '#181656',
        'surface-2': '#1a185c',
        'surface-3': '#1c1a62',
        'text-primary': '#eceaff',
        'text-secondary': '#c3c0fb',
        'text-muted': '#9d99ee',
      },
    },
    git: { added: '#a9ff9f', removed: '#e58a8f', modified: '#edf171', merged: '#c58bd0' },
  },
})
