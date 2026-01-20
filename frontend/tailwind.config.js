/** @type {import('tailwindcss').Config} */
import tailwindAnimate from "tailwindcss-animate"

export default {
    darkMode: ["class"],
    content: [
        './pages/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
        './app/**/*.{js,jsx}',
        './src/**/*.{js,jsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // Retain legacy names for now to prevent immediate breaks, pointing to variables
                'bg-void': "hsl(var(--background))",
                'bg-panel': "hsl(var(--card))",
                'status-success': "hsl(var(--success))",
                'status-warning': "hsl(var(--warning))",
                'status-danger': "hsl(var(--destructive))",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                fadeOut: {
                    "0%": { opacity: "1" },
                    "100%": { opacity: "0" },
                },
                slideDown: {
                    "0%": { transform: "translate(-50%, -20px)", opacity: "0" },
                    "100%": { transform: "translate(-50%, 0)", opacity: "1" },
                },
                ping: {
                    "75%, 100%": { transform: "scale(2)", opacity: "0" },
                },
                loadingBar: {
                    '0%': { width: '0%', marginLeft: '0%' },
                    '50%': { width: '40%', marginLeft: '30%' },
                    '100%': { width: '30%', marginLeft: '100%' },
                }
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                fadeIn: "fadeIn 0.5s ease-out",
                fadeOut: "fadeOut 0.5s ease-out forwards",
                slideDown: "slideDown 0.4s ease-out",
                ping: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                loadingBar: 'loadingBar 1.5s ease-in-out infinite',
            },
        },
    },
    plugins: [tailwindAnimate],
}
