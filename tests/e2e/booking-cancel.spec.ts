import { test, expect } from "@playwright/test";
import { dateInDays, makeUser, registerInNewContext } from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";
import { SlotsPage } from "../pages/slots-page";
import { BookingPage } from "../pages/booking-page";

test("отмена встречи: гость отменяет бронь, отменённую встречу видят обе стороны", async ({
  browser,
}) => {
  // Сценарий держит два браузерных контекста и ждёт бронь на живом стенде —
  // стандартных 30 секунд из конфига ему не хватает.
  test.setTimeout(60_000);

  const runId = Date.now();
  const skillTag = `Playwright-cancel-${runId}`;
  const host = makeUser("cancelhost", runId);
  const guest = makeUser("cancelguest", runId);

  const hostPage = await registerInNewContext(browser, host);
  const guestPage = await registerInNewContext(browser, guest);

  try {
    const hostProfile = new ProfilePage(hostPage);
    const hostSlots = new SlotsPage(hostPage);
    const hostBooking = new BookingPage(hostPage);
    const guestBooking = new BookingPage(guestPage);

    await test.step("Хост добавляет навык «могу помочь»", async () => {
      await hostProfile.open();
      await hostProfile.addSkill(skillTag, "can_help");
    });

    await test.step("Навык появился в блоке «могу помочь»", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост выкладывает свободный слот на завтра", async () => {
      await hostSlots.open();
      await hostSlots.addSlot(dateInDays(1), "12:00");
    });

    await test.step("Слот появился в списке хоста", async () => {
      await expect(hostSlots.slotCards).toHaveCount(1);
    });

    await test.step("Гость находит хоста по навыку и бронирует его слот", async () => {
      await guestBooking.searchBySkill(skillTag);
      await guestBooking.openPersonCard(host.name);
      await guestBooking.openFirstSlot();
      await guestBooking.confirmBooking();
    });

    await test.step("Бронирование подтвердилось", async () => {
      await expect(guestBooking.confirmSuccess).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Гость видит встречу с хостом в «Ближайших»", async () => {
      await expect(async () => {
        await guestBooking.openMyMeetings();
        await expect(guestBooking.upcomingMeeting(host.name)).toBeVisible();
      }).toPass({ timeout: 10_000 });
    });

    await test.step("Гость отменяет встречу", async () => {
      await guestBooking.cancelMeeting(host.name);
    });

    await test.step("Карточка ушла из «Ближайших» в «Прошедшие и отменённые»", async () => {
      await expect(guestBooking.upcomingMeeting(host.name)).toHaveCount(0);
      await expect(guestBooking.pastMeeting(host.name)).toContainText("отменено");
    });

    await test.step("Гость перезагружает страницу", async () => {
      await guestBooking.reload();
    });

    await test.step("После перезагрузки отмена никуда не делась", async () => {
      await expect(guestBooking.upcomingMeeting(host.name)).toHaveCount(0);
      await expect(guestBooking.pastMeeting(host.name)).toContainText("отменено");
    });

    await test.step("Хост видит ту же встречу отменённой, с именем гостя", async () => {
      await expect(async () => {
        await hostBooking.openMyMeetings();
        await expect(hostBooking.pastMeeting(guest.name)).toContainText("отменено");
      }).toPass({ timeout: 10_000 });
      await expect(hostBooking.upcomingMeeting(guest.name)).toHaveCount(0);
    });
  } finally {
    await hostPage.context().close();
    await guestPage.context().close();
  }
});
