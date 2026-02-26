import type { Config } from 'tailwindcss';

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          core: 'var(--color-core)',
          clarity: 'var(--color-clarity)',
          connection: 'var(--color-connection)',
          collaboration: 'var(--color-collaboration)',
        },
        grey: {
          50: 'var(--grey-50)',
          100: 'var(--grey-100)',
          300: 'var(--grey-300)',
          400: 'var(--grey-400)',
          500: 'var(--grey-500)',
          700: 'var(--grey-700)',
          900: 'var(--grey-900)',
        },
      },
      fontFamily: {
        headings: 'var(--font-headings)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 2px 6px rgba(0, 0, 0, 0.08)',
        md: '0 3px 10px rgba(0, 0, 0, 0.1)',
        lg: '0 4px 20px rgba(10, 59, 79, 0.08)',
        xl: '0 8px 30px rgba(10, 59, 79, 0.12)',
      },
    },
  },
};

export default preset;
