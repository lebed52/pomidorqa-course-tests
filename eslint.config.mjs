// Парсер TypeScript позволяет ESLint понимать синтаксис наших `.ts`-тестов.
import tseslint from "typescript-eslint";
// Плагин добавляет правила, которые знают особенности Playwright API.
import playwright from "eslint-plugin-playwright";

// Берём готовую рекомендуемую конфигурацию для современного flat config.
const playwrightRecommended = playwright.configs["flat/recommended"];

// ESLint flat config экспортируется массивом конфигурационных блоков.
export default [
  {
    // Подключаем базовые настройки и плагины из рекомендации Playwright.
    ...playwrightRecommended,
    // Проверяем только исходники тестов, не отчёты и не сгенерированные файлы.
    files: ["tests/**/*.ts"],
    // Настройки языка, на котором написаны проверяемые файлы.
    languageOptions: {
      // Просим ESLint разбирать файлы как TypeScript.
      parser: tseslint.parser,
    },
    // Правила ниже блокируют опасные конструкции или осознанно разрешают старый учебный код.
    rules: {
      // Сохраняем весь рекомендованный набор правил как основу.
      ...playwrightRecommended.rules,
      // Фиксированная пауза замедляет тест и маскирует неправильное ожидание состояния.
      "playwright/no-wait-for-timeout": "error",
      // `force` обходит проверки Playwright и часто скрывает проблему UI или локатора.
      "playwright/no-force-option": "error",
      // Забытый `await` создаёт гонки и ложные результаты теста.
      "playwright/missing-playwright-await": "error",
      // Закомментированный тест — мёртвый код; его предыдущую версию уже хранит Git.
      "playwright/no-commented-out-tests": "error",
      // `page.pause()` остановит и в итоге завесит автоматический CI-прогон.
      "playwright/no-page-pause": "error",
      // `test.only` может дать зелёный CI, запустив один тест вместо полного набора.
      "playwright/no-focused-test": "error",
      // Сценарий без `expect` выполняет действия, но не подтверждает результат.
      "playwright/expect-expect": "error",
      // Старые учебные тесты содержат условия; их рефакторинг не относится к этому PR.
      "playwright/no-conditional-in-test": "off",
      // Эти правила форматируют уже существующие учебные тесты, но не ловят флаки.
      // Не переписываем интервалы между блоками только ради стиля.
      "playwright/consistent-spacing-between-blocks": "off",
      // Не меняем существующие отрицательные проверки только ради предпочтительного синтаксиса.
      "playwright/no-useless-not": "off",
      // Соглашение о названиях тестов можно внедрить отдельно, не смешивая с запуском CI.
      "playwright/valid-title": "off",
    },
  },
];
