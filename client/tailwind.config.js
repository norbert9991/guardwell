import { Config } from 'tailwindcss';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Brand colors based on GuardWell Cyber theme
                primary: {
                    50: '#e0fcfc',
                    100: '#b3f6f6',
                    200: '#80eeef',
                    300: '#4de5e7',
                    400: '#26dfe1',
                    500: '#00E5FF', // Electric Cyan
                    600: '#00b8cc',
                    700: '#008b99',
                    800: '#005d66',
                    900: '#002e33',
                },
                secondary: {
                    50: '#fce0fe',
                    100: '#f6b3fc',
                    200: '#ef80fa',
                    300: '#e74df7',
                    400: '#e126f5',
                    500: '#D500F9', // Neon Purple
                    600: '#aa00c7',
                    700: '#800095',
                    800: '#550064',
                    900: '#2b0032',
                },
                dark: {
                    DEFAULT: '#0B0F19', // Deep Void
                    light: '#151B2B',
                    lighter: '#1F2940',
                },
                danger: {
                    DEFAULT: '#FF2D55',
                    light: '#FF8EA0',
                    dark: '#CC0029',
                },
                warning: {
                    DEFAULT: '#FFD600',
                    light: '#FFE57F',
                    dark: '#C79A00',
                },
                success: {
                    DEFAULT: '#00E676',
                    light: '#69F0AE',
                    dark: '#00B248',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(0, 229, 255, 0.3)',
                'glow-lg': '0 0 40px rgba(0, 229, 255, 0.4)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            }
        },
    },
    plugins: [],
}
