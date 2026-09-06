import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

// E2E-уровень пирамиды: реальный браузер на живом стенде aiqa.su/pomidorqa.
// ДЗ Урока 12: гость бронирует встречу и отменяет её. Карточка переходит
// из «Ближайших» в «Прошедшие и отменённые», и это видят оба участника:
// гость после перезагрузки и хост в своих «Моих встречах».

test("гость отменяет встречу: карточка уходит в прошедшие, отмену видят оба", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const runId = Date.now();
  const skillTag = `Playwright-cancel-${runId}`;
  const host = makeUser("host", runId);
  const guest = makeUser("guest", runId);

  // Два независимых аккаунта = два независимых браузерных контекста
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);
  const guestBooking = new BookingPage(guestPage);

  try {
    await test.step("Хост: регистрируется в PomidorQA", async () => {
      await registerUser(hostPage, host);
    });

    await test.step("Хост: добавляет навык «могу помочь» в профиле", async () => {
      await hostProfile.open();
      await hostProfile.addSkill(skillTag, "can_help");
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBooking.openSlots();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);
      await hostBooking.addSlot(date, "12:00");
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется отдельным аккаунтом", async () => {
      await registerUser(guestPage, guest);
    });

    await test.step("Гость: ищет хоста в каталоге по навыку", async () => {
      await guestBooking.catalogFilterInput.fill(skillTag);
      await guestBooking.catalogFilterSubmit.click();
      await expect(guestBooking.personCardByName(host.name)).toBeVisible();
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBooking.personCardByName(host.name).click();
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step("Гость: кликает по дню и времени в календаре слотов", async () => {
      // Календарь на карточке догидратируется не сразу: если дня ещё нет —
      // перезагружаем страницу и пробуем снова (паттерн booking-flow).
      await expect(async () => {
        const dayChip = guestBooking.calendarDay.first();
        if (!(await dayChip.isVisible().catch(() => false))) {
          await guestPage.reload();
        }
        await expect(dayChip).toBeVisible();
      }).toPass({ timeout: 10_000 });

      await guestBooking.calendarDay.first().click();
      await guestBooking.calendarTime.first().click();
      await expect(guestBooking.confirmDialog).toBeVisible();
    });

    await test.step("Гость: подтверждает бронирование — успех", async () => {
      await guestBooking.confirmButton.click();
      const success = guestBooking.confirmSuccess;
      const error = guestBooking.confirmError;
      await expect(success.or(error)).toBeVisible({ timeout: 15_000 });
      if (await error.isVisible().catch(() => false)) {
        throw new Error(`Бронирование не удалось: ${await error.textContent()}`);
      }
    });

    await test.step("Гость: видит встречу в разделе «Мои встречи»", async () => {
      await expect(async () => {
        await guestBooking.openBookings();
        await expect(guestBooking.bookingCardByName(host.name)).toBeVisible();
      }).toPass({ timeout: 10_000 });
    });

    await test.step("Гость: отменяет встречу", async () => {
      await guestBooking.cancelBooking(host.name);
    });

    await test.step("У гостя карточка ушла из «Ближайших» в «Прошедшие и отменённые»", async () => {
      // Из предстоящих карточка исчезла — негативная проверка,
      // в прошедших появилась с пометкой «отменено».
      await expect(guestBooking.bookingCardByName(host.name)).not.toBeVisible();
      const pastCard = guestBooking.pastCardByName(host.name);
      await expect(pastCard).toBeVisible();
      await expect(pastCard).toContainText("отменено");
    });

    await test.step("Гость: после перезагрузки отмена на месте", async () => {
      // Reload выбрасывает состояние страницы: отмена должна прийти с сервера.
      await guestPage.reload();
      const pastCard = guestBooking.pastCardByName(host.name);
      await expect(pastCard).toBeVisible();
      await expect(pastCard).toContainText("отменено");
    });

    await test.step("Хост: видит отменённую встречу именно с этим гостем", async () => {
      await hostBooking.openBookings();
      const hostPastCard = hostBooking.pastCardByName(guest.name);
      await expect(hostPastCard).toBeVisible();
      await expect(hostPastCard).toContainText("отменено");
    });
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});