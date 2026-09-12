import { test, expect } from "@playwright/test";

import {  makeSearchData, registerUser, } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

test("гость находит пользователя в каталоге по уникальному навыку", async ({
  browser,
}) => {
  const { skill, slotDate, host } = makeSearchData();

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);

    await test.step("Хост регистрируется", async () => {
      await registerUser(hostPage, host);
    });

    await test.step("Хост добавляет уникальный навык", async () => {
      await hostPage.goto("/pomidorqa/profile");
      await hostProfile.addSkill(skill);
    });

    await test.step("Проверяем, что навык добавлен", async () => {
      await expect(
        hostPage.getByTestId("can-help-skills"),
      ).toContainText(skill);
    });

    await test.step("Хост добавляет свободный слот на завтра", async () => {
      await hostPage.goto("/pomidorqa/profile/slots");
      await hostBooking.addSlot(slotDate, "12:00");
    });

    await test.step("Проверяем, что свободный слот создан", async () => {
      await expect(hostBooking.freeSlot()).toBeVisible();
    });

    await test.step("Гость выполняет поиск по уникальному навыку", async () => {
      await guestPage.goto("/pomidorqa/");
      await guestBooking.searchBySkill(skill);
    });

    await test.step("Проверяем, что в результатах найден хост", async () => {
      const hostCard = guestBooking.catalogCard(host.name);

      await expect(hostCard).toBeVisible();
      await expect(hostCard).toContainText(skill);
    });

    await hostContext.close();
    await guestContext.close();
  });