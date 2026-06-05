import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ccff00',
          container: '#c3f400',
          'container-dim': '#abd600',
          on: '#283500',
          'on-container': '#556d00',
          'on-container-dim': '#3c4d00',
        },
        secondary: {
          DEFAULT: '#ffb1c3',
          container: '#ff4b89',
          on: '#66002c',
          'on-container': '#590026',
        },
        tertiary: {
          DEFAULT: '#ffffff',
          container: '#efdbff',
          on: '#480081',
          'on-container': '#8b2ce3',
        },
        surface: {
          DEFAULT: '#111508',
          dim: '#111508',
          bright: '#373b2c',
          container: {
            lowest: '#0c0f04',
            low: '#1a1d10',
            DEFAULT: '#1e2113',
            high: '#282b1d',
            highest: '#333627',
          },
        },
        'on-surface': {
          DEFAULT: '#e2e4cf',
          variant: '#c4c9ac',
        },
        outline: {
          DEFAULT: '#8e9379',
          variant: '#444933',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
          on: '#690005',
          'on-container': '#ffdad6',
        },
        background: '#111508',
        'on-background': '#e2e4cf',
      },
      fontFamily: {
        headline: ['Lexend', 'sans-serif'],
        body: ['Hanken Grotesk', 'sans-serif'],
        label: ['Hanken Grotesk', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      spacing: {
        'bento': '20px',
        'gutter': '16px',
        'container': '24px',
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
