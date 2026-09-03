import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";

const playwrightRecommended = playwright.configs["flat/recommended"];

export default [
  {
    ignores: ["**/ci-fail-demo.spec.ts"],
  },
  {
    ...playwrightRecommended,
    files: ["tests/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      ...playwrightRecommended.rules,
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-force-option": "error",
      "playwright/missing-playwright-await": "error",
      "playwright/no-commented-out-tests": "error",
      "playwright/no-page-pause": "error",
      "playwright/no-focused-test": "error",
      "playwright/expect-expect": "error",
      "playwright/no-conditional-in-test": "off",
      // Эти правила форматируют уже существующие учебные тесты, но не ловят флаки.
      "playwright/consistent-spacing-between-blocks": "off",
      "playwright/no-useless-not": "off",
      "playwright/valid-title": "off",
    },
  },
];
