/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                bg: 'var(--bg-color)',
                surface: 'var(--surface-color)',
                main: 'var(--text-main)',
                'on-bg': 'var(--text-on-bg)',
                border: 'var(--border-color)',
                shadow: 'var(--shadow-color)',
                primary: 'var(--accent-primary)',
                secondary: 'var(--accent-secondary)',
                tertiary: 'var(--accent-tertiary)',
            },
            boxShadow: {
                'hard': '4px 4px 0px 0px var(--shadow-color)',
            },
            fontFamily: {
                sans: ['var(--font-space)', 'sans-serif'],
                comic: ['var(--font-bangers)', 'cursive'],
            },
        },
    },
    plugins: [],
}
