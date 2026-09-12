import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { BookingPage } from "../pages/BookingPage";

test.describe("Каталог: поиск по навыку без результатов", () => {
  test.beforeEach(async ({ page }) => {
    const user = makeUser("catalog-empty", crypto.randomUUID().slice(0, 8));
    await registerUser(page, user);
  });

  test("поиск по несуществующему навыку даёт пустой результат", async ({ page }) => {
    const bookingPage = new BookingPage(page);
    const missingSkill = `NoSuchSkill-${crypto.randomUUID().slice(0, 8)}`;

    await test.step("Открываем каталог и ищем навык, которого нет в базе", async () => {
      await bookingPage.searchBySkill(missingSkill);
    });

    await test.step("Проверяем, что карточки не появились", async () => {
      await expect(bookingPage.catalogCard).toHaveCount(0);
    });
  });
});
