import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

const playwrightRecommended = playwright.configs['flat/recommended'];

export default [
  {
    ...playwrightRecommended,
    files: ['tests/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      ...playwrightRecommended.rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-force-option': 'error',
      'playwright/missing-playwright-await': 'error',
      'playwright/no-commented-out-tests': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/expect-expect': 'error',
      'playwright/no-conditional-in-test': 'off',
      'playwright/valid-title': 'warn',
    },
  },
];
