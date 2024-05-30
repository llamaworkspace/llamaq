/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').options} */
const config = {
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  plugins: ["prettier-plugin-organize-imports"],
};

export default config;
