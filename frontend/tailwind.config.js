/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#e8f1f9',
                    100: '#c5dcef',
                    200: '#9fc4e4',
                    300: '#73aad8',
                    400: '#4d92cd',
                    500: '#005387',
                    600: '#004570',
                    700: '#00375a',
                    800: '#002944',
                    900: '#001b2e',
                },
                success: '#99CC26',
                warning: '#D9C563',
                danger: '#A61C1C',
                info: '#7FB3B3',
                rura: {
                    deepBlue: '#005387',
                    limeGreen: '#99CC26',
                    mutedTeal: '#7FB3B3',
                    gold: '#D9C563',
                    red: '#A61C1C',
                    charcoal: '#424242',
                    slate: '#8E8E93',
                    offWhite: '#F7F9FA',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'elevated': '0 10px 40px -10px rgba(0, 0, 0, 0.12)',
            },
        },
    },
    plugins: [],
}
