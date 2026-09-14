/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './sites/**/*.html', './react-app/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        'primary': '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#A855F7',
        'on-primary-container': '#000000',
        'primary-fixed': '#e2dfff',
        'secondary-fixed': '#cae6ff',
        'tertiary-fixed': '#ffd8df',
        'surface': '#ffffff',
        'surface-variant': '#FFFDF5',
        'on-surface': '#000000',
        'on-surface-variant': '#1a1a1a',
        'outline': '#000000',
        'background': '#FFFDF5',
        'neo-yellow': '#F9E900',
        'neo-green': '#B8FF00',
        'neo-purple': '#A855F7',
        'neo-pink': '#FF2E93',
        'neo-blue': '#65F4FF',
        'neo-orange': '#FF7A00',
        'neo-black': '#000000',
        'neo-white': '#ffffff',
      },
      fontFamily: {
        'sans': ['"Space Grotesk"', '"DM Sans"', 'sans-serif'],
        'mono': ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
        'headline': ['"Archivo Black"', '"Anybody"', '"Space Grotesk"', 'sans-serif'],
        'label': ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        'neo': '6px 6px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '3px 3px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
        'neo-xl': '12px 12px 0px 0px rgba(0,0,0,1)',
      }
    }
  },
  plugins: [],
};
