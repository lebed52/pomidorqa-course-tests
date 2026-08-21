import { test, expect, type Page } from "@playwright/test";

type TestUser = {
  name: string;
  email: string;
  password: string;
};

function makeUser(role: string, runId: number): TestUser {
  return {
    name: `${role} Автотест`,
    email: `${role}-${runId}@example.com`,
    password: "testpass123",
  };
}

//регистрация пользователя
const registerNameInput = (page: Page) => page.getByLabel("Имя");
const registerEmailInput = (page: Page) => page.getByLabel("Email");
const registerPasswordInput = (page: Page) => page.getByLabel("Пароль");
const registerSubmitButton = (page: Page) => page.getByRole("button", { name: "Зарегистрироваться" });

//работа со слотами
const Slots = (page: Page) => ({
  SlotDate: () => page.locator('#pomidorqa-slots-date'),
  SlotTime: () => page.locator('#pomidorqa-slots-time'),
  AddSlot: () => page.getByRole('button', { name: 'Добавить слот' }),
  ListSkill: () => page.locator('//div[@data-slot-status ="free"]'),
});

//Бронирование
const Booking = (page: Page) => ({
  CalendarDay: () => page.locator('[aria-pressed="true"]'),
  CalendarTime: () => page.getByRole('group', { name: 'Время слотов' }).getByRole('button'),
  ConfirmModalDialog: () => page.locator('[role="dialog"]'),
  ConfirmModalConfirm: () => page.getByRole('button', { name: 'Подтвердить' }),
  ConfirmModalSuccess: () => page.getByText('Забронировано'),
  ConfirmModalError: () => page.getByText('Этот слот только что забронировали'),
});