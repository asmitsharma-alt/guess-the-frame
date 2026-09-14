/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './sites/**/*.html'],
  theme: {
    extend: {
      colors: {
        'primary': '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#bd93f9',
        'on-primary-container': '#1a1c19',
        'primary-fixed': '#e2dfff',
        'secondary-fixed': '#cae6ff',
        'tertiary-fixed': '#ffd8df',
        'surface': '#ffffff',
        'surface-variant': '#f4f4ee',
        'on-surface': '#1a1c19',
        'on-surface-variant': '#43483f',
        'outline': '#74796e',
        'background': '#fafaf4',
        'neo-yellow': '#f1c40f',
        'neo-green': '#2ecc71',
        'neo-purple': '#9b59b6',
        'neo-pink': '#e91e63',
        'neo-blue': '#3498db',
      },
      fontFamily: {
        'sans': ['"DM Sans"', 'sans-serif'],
        'mono': ['"Space Mono"', '"JetBrains Mono"', 'monospace'],
        'headline': ['"Anybody"', '"DM Sans"', 'sans-serif'],
        'label': ['"Space Grotesk"', '"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        'neo': '6px 6px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '3px 3px 0px 0px rgba(0,0,0,1)',
      }
    }
  },
  plugins: [],
};
