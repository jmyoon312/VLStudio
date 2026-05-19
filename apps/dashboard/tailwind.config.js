/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        './apps/dashboard/src/**/*.{ts,tsx}',
        './apps/dashboard/src/components/**/*.{ts,tsx}',
        './apps/dashboard/src/pages/**/*.{ts,tsx}',
        './apps/dashboard/src/app/**/*.{ts,tsx}',
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
                    DEFAULT: "#3B82F6",
                    foreground: "#FFFFFF",
                    hover: "#2563EB",
                },
                secondary: {
                    DEFAULT: "#F3F4F6",
                    foreground: "#1F2937",
                },
                destructive: {
                    DEFAULT: "#EF4444",
                    foreground: "#FFFFFF",
                },
                muted: {
                    DEFAULT: "#F3F4F6",
                    foreground: "#6B7280",
                },
                accent: {
                    DEFAULT: "#F3F4F6",
                    foreground: "#1F2937",
                },
                popover: {
                    DEFAULT: "#FFFFFF",
                    foreground: "#1F2937",
                },
                card: {
                    DEFAULT: "#FFFFFF",
                    foreground: "#1F2937",
                },
                border: "#E5E7EB",
                input: "#E5E7EB",
                ring: "#3B82F6",
                background: "#F8F9FC",
                foreground: "#1F2937",
                "pixie-blue": "#3B82F6",
                "pixie-gray": "#F8F9FC",
                "pixie-border": "#E5E7EB",
                "pixie-text": "#1F2937",
                "pixie-sub": "#6B7280",
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
                sans: ["Pretendard", "Inter", "system-ui", "-apple-system", "sans-serif"],
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
    plugins: [require("tailwindcss-animate")],
}