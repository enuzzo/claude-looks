import { makeColors } from '../../make-colors.js'

// An 8-bit home computer of the C64 kind: the screen's blue taken down for hours of work, its
// light-blue type as the accent, the other roles from its sixteen colours, lifted to read. By day the
// blue is lighter, nearer the machine's own.
const roles = { accent: '#9895ff', danger: '#f0959a', success: '#a9ff9f', warning: '#edf171', pro: '#d39be0' }
const git = { added: '#a9ff9f', removed: '#f0959a', modified: '#edf171', merged: '#d39be0' }

export const { theme, problems } = makeColors({
  label: 'Home computer',
  only: 'dark',
  roles,
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
    git,
  },
})

export const { theme: dayTheme, problems: dayProblems } = makeColors({
  label: 'Home computer (day)',
  only: 'dark',
  roles: { ...roles, accent: '#aeabff', danger: '#f6a5a9', pro: '#dfb0ea' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1c1a64',
        'surface-1': '#1d1b68',
        'surface-2': '#1f1c6c',
        'surface-3': '#201d70',
        'text-primary': '#f2f1ff',
        'text-secondary': '#d0cdfd',
        'text-muted': '#aca8f4',
      },
    },
    git,
  },
})
