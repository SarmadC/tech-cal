// tailwind.config.ts (Corrected)

import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],

    // 👇 FIX: Use "class" for manual dark mode toggling.
    darkMode: "class",

    // Safelist to prevent purging of dynamic color classes
    safelist: [
        // Event type tag colors
        'bg-indigo-500/20', 'border-indigo-500/30', 'text-indigo-300', 'text-indigo-700',
        'bg-amber-500/20', 'border-amber-500/30', 'text-amber-300', 'text-amber-700',
        'bg-emerald-500/20', 'border-emerald-500/30', 'text-emerald-300', 'text-emerald-700',
        'bg-rose-500/20', 'border-rose-500/30', 'text-rose-300', 'text-rose-700',
        'bg-cyan-500/20', 'border-cyan-500/30', 'text-cyan-300', 'text-cyan-700',
        'bg-violet-500/20', 'border-violet-500/30', 'text-violet-300', 'text-violet-700',
        'bg-blue-500/20', 'border-blue-500/30', 'text-blue-300', 'text-blue-700',
        'bg-green-500/20', 'border-green-500/30', 'text-green-300', 'text-green-700',
        'bg-purple-500/20', 'border-purple-500/30', 'text-purple-300', 'text-purple-700',
        'bg-orange-500/20', 'border-orange-500/30', 'text-orange-300', 'text-orange-700',
        'bg-pink-500/20', 'border-pink-500/30', 'text-pink-300', 'text-pink-700',
        'bg-gray-500/20', 'border-gray-500/30', 'text-gray-300', 'text-gray-700',
    ],
    blocklist: [
        '[-:.]',
    ],

    theme: {
        extend: {
            colors: {
                foreground: 'hsl(var(--foreground))',
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                success: 'var(--success)',
                warning: 'var(--warning)',
                error: 'var(--error)',
                border: 'hsl(var(--border))',
                gray: {},
                zinc: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',
                    800: '#27272a',
                    900: '#18181b',
                    950: '#09090b',
                },
                neutral: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                    950: '#0a0a0a',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                }
            },
            boxShadow: {
                xs: 'var(--shadow-xs)',
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
                xl: 'var(--shadow-xl)'
            },
            fontFamily: {
                sans: [
                    'var(--font-sans)'
                ],
                mono: [
                    'var(--font-mono)'
                ],
                'dm-sans': [
                    'var(--font-sans)',
                    'DM Sans',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif'
                ],
                aeonik: [
                    'Aeonik',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif'
                ]
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                shimmer: "shimmer 2s linear infinite"
            },
            keyframes: {
                fadeIn: {},
                slideUp: {},
                slideDown: {},
                shimmer: {
                    from: {
                        backgroundPosition: "0 0",
                    },
                    to: {
                        backgroundPosition: "-200% 0",
                    },
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            }
        }
    },
    plugins: [require("tailwindcss-animate")]
};

export default config;