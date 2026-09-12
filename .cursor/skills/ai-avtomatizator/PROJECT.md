# Карта проекта PomidorQA

## Основные файлы

- `CODEX.md` — обязательные правила написания и ревью автотестов.
- `playwright.config.ts` — проекты `unit`, `api`, `e2e`, base URL и артефакты.
- `eslint.config.mjs` — обязательные Playwright ESLint-правила.
- `package.json` — команды тестов и линтера.

## Тестовые слои

- `tests/unit/` — тесты чистых функций без браузерного контекста.
- `tests/api/` — тесты HTTP API и бизнес-правил.
- `tests/e2e/` — браузерные пользовательские сценарии.
- `tests/helpers/` — тестовые данные, API-регистрация, вход и очистка.
- `tests/pages/` — Page Object’ы, локаторы и действия на экранах.

## Существующие строительные блоки

### Helpers

`tests/helpers/user.ts`:

- `TestUser`;
- `RegisteredParticipant`;
- `makeUser(role, runId)`;
- `registerUserViaApi(request, user)`;
- `deleteUserViaApi(request)`;
- `cleanupUsersViaApi(contexts)`.

Используй их вместо локальных копий. Добавляй новый helper сюда только для ответственности пользователя; остальные домены размещай в отдельных тематических helper-файлах.

### Page Object

`tests/pages/login-page.ts`:

- `LoginPage.goto()`;
- `LoginPage.login(email, password)`;
- поля входа и сообщение ошибки.

`tests/pages/register-page.ts`:

- `RegisterPage.goto()`;
- `RegisterPage.fillForm(user)`;
- `RegisterPage.submit()`;
- поля регистрации.

Для профиля, каталога, бронирования и других экранов сначала проверь, не появился ли новый Page Object после создания этой справки. Если нет — создай отдельный `<feature>-page.ts`.

## Команды

```bash
npm run test:unit
npm run test:api
npm run test:e2e
npm run lint
```

Для быстрого цикла запускай конкретный spec с соответствующим `--project`, затем полный `npm run lint`.

## Важная оговорка

Некоторые учебные или старые spec-файлы содержат локаторы, helpers и assertions внутри action steps. Они полезны для понимания сценария, но не являются эталоном структуры. При конфликте всегда применяй актуальный `CODEX.md`.
