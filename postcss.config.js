// postcss.config.js
module.exports = {
  plugins: {
    'tailwindcss/nesting': {}, // 👈 Add this line
    tailwindcss: {},
    autoprefixer: {},
  },
};