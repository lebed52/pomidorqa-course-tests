import type { Page } from "@playwright/test";

// Page Object профиля PomidorQA: все локаторы живут здесь,
// в спеке не должно быть ни одного page.getBy*/page.locator.
export const locators = {
  // Локаторы полей ввода
  nameInput: (page: Page) => page.getByRole("textbox", { name: "Имя" }),
  telegramInput: (page: Page) => page.getByRole("textbox", { name: "Telegram" }),
  aboutInput: (page: Page) => page.getByRole("textbox", { name: "О себе" }),
  skillInput: (page: Page) => page.getByRole("textbox", { name: "Навык" }),

  // Локаторы выпадающих списков
  timezoneSelect: (page: Page) => page.getByRole("combobox", { name: "Часовой пояс" }),
  skillTypeSelect: (page: Page) => page.getByLabel("Тип"),

  // Локаторы кнопок
  saveButton: (page: Page) => page.getByRole("button", { name: "Сохранить" }),
  addSkillButton: (page: Page) => page.getByRole("button", { name: "Добавить" }),

  // Контейнеры списков навыков
  canHelpSkills: (page: Page) => page.getByTestId("can-help-skills"),
  wantToLearnSkills: (page: Page) => page.getByTestId("want-to-learn-skills"),

  // Конкретный навык: чип и кнопка его удаления
  skillChip: (page: Page, skillTag: string) =>
    page.locator(`[data-skill-tag="${skillTag}"]`),
  removeSkillButton: (page: Page, skillTag: string) =>
    page.getByRole("button", { name: `Убрать ${skillTag}` }),

  // Любой навык (любой дочерний элемент в контейнерах навыков)
  anyNewSkill: (page: Page) =>
    page
      .getByTestId("can-help-skills")
      .locator("*")
      .or(page.getByTestId("want-to-learn-skills").locator("*")),
};
