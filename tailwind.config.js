/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        './index.html',
        './apps/dashboard/index.html',
        './apps/dashboard/src/**/*.{js,jsx,ts,tsx,html}',
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
            colors: {
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                    hover: "var(--primary-hover)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                background: "var(--background)",
                foreground: "var(--foreground)",
                sidebar: "var(--sidebar)",
                "sidebar-border": "var(--sidebar-border)",
                "pixie-blue": "var(--primary)",
                "pixie-gray": "var(--background)",
                "pixie-border": "var(--border)",
                "pixie-text": "var(--foreground)",
                "pixie-sub": "var(--muted-foreground)",
            },
            borderRadius: {
                lg: "12px",
                md: "8px",
                sm: "4px",
                xl: "24px",
            },
            boxShadow: {
                'pixie': '0 4px 20px rgba(0, 0, 0, 0.05)',
                'pixie-float': '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            },
            fontFamily: {
                sans: ["var(--font-sans)", "Wanted Sans Variable", "Wanted Sans", "Pretendard Variable", "Pretendard", "Noto Sans KR", "Inter", "system-ui", "-apple-system", "sans-serif"],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [],
}
