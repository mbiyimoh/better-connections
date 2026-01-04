import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS variable colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // Better Connections Design System - OLED optimized
        bg: {
          primary: '#121212',    // OLED optimized (was #0D0D0F)
          secondary: '#1E1E1E',  // (was #1A1A1F)
          tertiary: '#2A2A2A',   // (was #252529)
          glass: 'rgba(30, 30, 30, 0.85)',
        },
        text: {
          primary: '#E0E0E0',    // Reduced eye strain (was #FFFFFF)
          secondary: '#A0A0A8',
          tertiary: '#707078',   // Better contrast (was #606068)
        },
        gold: {
          primary: '#d4a54a',
          light: '#e5c766',
          subtle: 'rgba(212, 165, 74, 0.15)',
          glow: 'rgba(212, 165, 74, 0.3)',
        },
        category: {
          relationship: '#3B82F6',
          opportunity: '#22C55E',
          expertise: '#A855F7',
          interest: '#F59E0B',
        },
        success: '#4ADE80',
        warning: '#FBBF24',
        error: '#EF4444',
      },
      fontFamily: {
        // 33 Strategies Font Stack
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        // Keep sans as fallback
        sans: [
          'var(--font-body)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        display: '32px',
        heading: '24px',
        title: '18px',
        body: '14px',
        small: '13px',
        caption: '11px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      padding: {
        safe: 'env(safe-area-inset-bottom)',
      },
      zIndex: {
        '45': '45',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '16px',
      },
      backdropBlur: {
        glass: '12px',
        'glass-medium': '16px',
        'glass-strong': '20px',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
