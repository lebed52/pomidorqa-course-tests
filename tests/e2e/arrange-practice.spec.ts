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

// validation.ts

const validateEmail = (email: string): boolean => {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
};

const validateName = (name: string): boolean => {
  if (!name) return false;
  // Разрешены кириллица, пробелы. Тире (-) не включено в паттерн, как в твоем примере ("Анна-Мария" -> False)
  const pattern = /^[А-Яа-яЁё\s]+$/;
  return pattern.test(name);
};

const validateDate = (dateStr: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr);
  
  // Проверка на валидность даты (например, 2024-02-30 вернет Invalid Date)
  // Проверка, что год, месяц и день совпадают с введенными (защита от часовых поясов)
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Месяцы начинаются с 0
  const day = date.getDate();

  const [inputYear, inputMonth, inputDay] = dateStr.split('-').map(Number);

  return (
    !isNaN(date.getTime()) &&
    year === inputYear &&
    month === inputMonth &&
    day === inputDay
  );
};
