import { type Page } from "@playwright/test";
import { registerUser, type TestUser } from "./user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

// Урок 13: подготовка хоста склеилась в helpers — раньше последовательности
// «регистрация → навык» и «слоты → слот» копировались из спеки в спеку.
// Разбита на два шага: между ними спека проверяет результат на той странице,
// где он появился (навык — на профиле, слот — на странице слотов).
// Без будущего свободного слота участник не попадает в каталог, поэтому
// хост для сценариев каталога и бронирования поднимается целиком.

export async function registerHostWithSkill(
  page: Page,
  host: TestUser,
  skillTag: string,
): Promise<void> {
  await registerUser(page, host);
  const profile = new ProfilePage(page);
  await profile.open();
  await profile.addSkill(skillTag, "can_help");
}

export async function addOpenSlot(page: Page, slotDate: string): Promise<void> {
  const booking = new BookingPage(page);
  await booking.openSlots();
  await booking.addSlot(slotDate, "12:00");
}
