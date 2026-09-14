import { test, expect } from "@playwright/test";
import { UserRegistry, uniqueTag, type TestUser } from "../helpers/user";
import { addOpenSlot } from "../helpers/host";
import { ProfilePage } from "../pages/profile-page";
import { BookingPage } from "../pages/booking-page";

// Урок 13: поиск в каталоге PomidorQA. Урок 14: участники заводятся через API —
// регистрация осталась за пределами браузера, потому что эти тесты проверяют
// каталог, а не форму регистрации. beforeEach поднимает пару на каждый тест:
// хоста (навык «могу помочь» + будущий слот — без слота участник в каталог
// не попадает) и гостя (своя карточка в каталоге не видна, поэтому все
// проверки «извне» — от него). afterEach гарантированно удаляет оба аккаунта
// и закрывает контексты — он выполняется и при падении теста, как finally.
// Тег навыка уникален, поэтому в выдаче по нему только этот хост.

test.describe("Каталог: поиск по навыку", () => {
  const users = new UserRegistry();

  let host: TestUser;
  let skillTag: string;
  let hostBooking: BookingPage;
  let guestBooking: BookingPage;

  test.beforeEach(async ({ browser }) => {
    skillTag = uniqueTag("Playwright-search");

    const hostSession = await users.add(browser, "host");
    const guestSession = await users.add(browser, "guest");
    host = hostSession.user;

    hostBooking = new BookingPage(hostSession.page);
    guestBooking = new BookingPage(guestSession.page);

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const slotDate = tomorrow.toISOString().slice(0, 10);

    // Подготовку проверяем здесь же — каждую часть на своей странице:
    // если навык или слот молча не сохранились, падение укажет
    // на подготовку, а не на поиск гостя.
    const hostProfile = new ProfilePage(hostSession.page);
    await hostProfile.open();
    await hostProfile.addSkill(skillTag, "can_help");
    await expect(hostProfile.canHelpSkills).toContainText(skillTag);
    await addOpenSlot(hostSession.page, slotDate);
    await expect(hostBooking.slotsCard.first()).toBeVisible();
  });

  test.afterEach(async () => {
    await users.cleanup();
  });

  test("по навыку находится участник со свободным слотом", async () => {
    await test.step("Гость: открывает каталог", async () => {
      await guestBooking.openCatalog();
    });

    await test.step("Гость: ищет по навыку хоста", async () => {
      await guestBooking.searchInCatalog(skillTag);
    });

    await test.step("В выдаче нашлась карточка хоста по имени", async () => {
      await expect(guestBooking.personCardByName(host.name)).toBeVisible();
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBooking.openPersonCard(host.name);
    });

    await test.step("Карточка хоста открыта", async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
    });

    await test.step("На карточке есть календарь со слотами", async () => {
      // Календарь догидратируется — даём ему время в самой проверке.
      await expect(guestBooking.calendarDay.first()).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test("по навыку без совпадений выдача пустая", async () => {
    // Хост с живым навыком и слотом существует — тест проверяет именно
    // «по чужому навыку не находит», а не «в каталоге вообще пусто».
    const missingTag = uniqueTag("NoSuchSkill");

    await test.step("Гость: открывает каталог", async () => {
      await guestBooking.openCatalog();
    });

    await test.step("Гость: ищет несуществующий навык", async () => {
      await guestBooking.searchInCatalog(missingTag);
    });

    await test.step("Показалось пустое состояние выдачи", async () => {
      await expect(guestBooking.catalogEmpty).toBeVisible();
    });

    await test.step("Карточек в выдаче нет", async () => {
      await expect(guestBooking.personCards).toHaveCount(0);
    });
  });

  test("собственная карточка не видна в каталоге", async () => {
    await test.step("Гость: открывает каталог", async () => {
      await guestBooking.openCatalog();
    });

    await test.step("Гость: ищет по навыку хоста", async () => {
      await guestBooking.searchInCatalog(skillTag);
    });

    await test.step("Контроль: гость видит карточку хоста", async () => {
      await expect(guestBooking.personCardByName(host.name)).toBeVisible();
    });

    await test.step("Хост: открывает каталог", async () => {
      await hostBooking.openCatalog();
    });

    await test.step("Хост: ищет по своему навыку", async () => {
      await hostBooking.searchInCatalog(skillTag);
    });

    await test.step("У хоста своя карточка не находится", async () => {
      await expect(hostBooking.catalogEmpty).toBeVisible();
      await expect(hostBooking.personCards).toHaveCount(0);
    });
  });
});
