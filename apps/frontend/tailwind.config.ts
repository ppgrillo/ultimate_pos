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
        headline: ['var(--font-headline)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        label: ['var(--font-body)', 'sans-serif'],
      },
      fontSize: {
        'headline-xl': ['48px', { lineHeight: '1.1', fontWeight: '800' }],
        'headline-lg': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        'body-md': ['16px', { lineHeight: '1.5' }],
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
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.3)',
        'elevation-2': '0 4px 6px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.2)',
        'elevation-3': '0 10px 25px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.3)',
        'elevation-4': '0 20px 50px rgba(0,0,0,0.65), 0 8px 20px rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        glass: '20px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
