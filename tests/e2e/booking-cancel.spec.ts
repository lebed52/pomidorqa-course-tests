import { test, expect } from "@playwright/test";
import { makeUser, registerUser } from "../helpers/user";
import { createHostAndGuestContexts, closeHostGuestPairContexts } from "../helpers/booking";
import { ProfilePage } from "../pages/profile-page";

test("гость отменяет бронирование: карточка переходит в прошедшие, отмену видят оба после reload", async ({
  browser,
}) => {
  test.setTimeout(90_000); // 2 регистрации + бронирование + отмена, с учётом retry-лупа в selectFirstSlot

  const runId = Date.now();
  const skillTag = `Playwright-cancel-${runId}`;
  const host = makeUser("host-cancel", runId);
  const guest = makeUser("guest-cancel", runId);

  const contexts = await createHostAndGuestContexts(browser);
  const { hostPage, guestPage, hostBooking, guestBooking } = contexts;
  const hostProfile = new ProfilePage(hostPage);

  try {
    await test.step("Хост: регистрируется и добавляет навык «могу помочь»", async () => {
      await registerUser(hostPage, host);
      await hostProfile.goto();
      await hostProfile.addSkill(skillTag, "can_help");
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBooking.addSlot("15:00");
      await expect(hostBooking.slotsCard.first()).toBeVisible();
    });

    await test.step("Гость: регистрируется и находит хоста по навыку", async () => {
      await registerUser(guestPage, guest);
      await guestBooking.searchBySkill(skillTag);
      await expect(guestBooking.catalogCard.filter({ hasText: host.name })).toBeVisible();
    });

    await test.step("Гость: бронирует слот у хоста", async () => {
      await guestBooking.openHostCard(host.name);
      await guestBooking.selectFirstSlot();
      await guestBooking.confirmBooking();
      await expect(guestBooking.bookingConfirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Гость: видит бронирование среди предстоящих встреч", async () => {
      await expect(async () => {
        await guestBooking.gotoBookings();
        await expect(guestBooking.bookingCardByName(host.name)).toBeVisible();
      }).toPass({ timeout: 10_000 });
    });

    await test.step("Гость: отменяет встречу", async () => {
    await guestBooking.cancelBooking(host.name);
    });

    await test.step("У гостя карточка появилась в прошедших с пометкой «отменено»", async () => {
    const pastCard = guestBooking.pastCardByName(host.name);
    await expect(pastCard).toBeVisible();
    await expect(pastCard).toContainText("отменено");
    });

    await test.step("После перезагрузки гость по-прежнему видит отмену", async () => {
      await guestBooking.page.reload();
      const pastCardAfterReload = guestBooking.pastCardByName(host.name);
      await expect(pastCardAfterReload).toBeVisible();
      await expect(pastCardAfterReload).toContainText("отменено");
    });

    await test.step("Хост: открывает свои встречи и видит отменённую встречу именно с этим гостем", async () => {
      await hostBooking.gotoBookings();
      const hostPastCard = hostBooking.pastCardByName(guest.name);
      await expect(hostPastCard).toBeVisible();
      await expect(hostPastCard).toContainText("отменено");
    });
  } finally {
    await closeHostGuestPairContexts(contexts);
  }
});