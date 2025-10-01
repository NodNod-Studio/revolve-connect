/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "@remix-run/eslint-config/jest-testing-library",
    "prettier",
  ],
  globals: {
    shopify: "readonly"
  },
  rules: {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "off",
    "indent": ["error", 2, { "SwitchCase": 1 }],
    "semi": ["error", "never"],
    "quotes": ["error", "single", { "avoidEscape": true }],
    "jsx-quotes": ["error", "prefer-single"],
    "react/jsx-indent": ["error", 2],
    "react/jsx-indent-props": ["error", 2],
  }
};