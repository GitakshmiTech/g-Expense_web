export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d8ebff',
          500: '#2f80ed',
          600: '#1f6ed4',
          700: '#1959ad'
        }
      },
      boxShadow: {
        soft: '0 14px 34px rgba(15, 23, 42, 0.08)',
        panel: '0 1px 2px rgba(15, 23, 42, 0.05), 0 16px 48px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
