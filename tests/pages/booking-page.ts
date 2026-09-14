import { type Locator, type Page } from "@playwright/test";

export class BookingPage {
  page: Page;
  catalogFilterInput: Locator;
  catalogFilterSubmit: Locator;
  catalogCard: Locator;
  personName: Locator;
  bookingCalendarDay: Locator;
  bookingCalendarTime: Locator;
  bookingConfirmDialog: Locator;
  bookingConfirmButton: Locator;
  bookingConfirmSuccess: Locator;
  bookingConfirmError: Locator;
  bookingsUpcomingSection: Locator;
  bookingsCardName: Locator;
  slotsDateInput: Locator;
  slotsTimeInput: Locator;
  slotsAddSubmit: Locator;
  slotsCard: Locator;
  bookingsPastSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });
    this.catalogCard = page.getByTestId("person-card");
    this.personName = page.getByRole("heading", { level: 1 });
    this.bookingCalendarDay = page
      .getByRole("group", { name: "Дни со слотами" })
      .getByRole("button");
    this.bookingCalendarTime = page
      .getByRole("group", { name: "Время слотов" })
      .getByRole("button");
    this.bookingConfirmDialog = page.getByRole("dialog");
    this.bookingConfirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: "Подтвердить" });
    this.bookingConfirmSuccess = page.getByRole("dialog").getByRole("status");
    this.bookingConfirmError = page.getByRole("dialog").getByRole("alert");
    this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
    this.bookingsCardName = this.bookingsUpcomingSection
      .locator("[data-booking-id]")
      .first()
      .locator("p")
      .first();
    this.slotsDateInput = page.locator("#pomidorqa-slots-date");
    this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
    this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
    this.slotsCard = page.locator("[data-slot-id]");
    this.bookingsPastSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Прошедшие и отменённые" }) });
  }

  async searchBySkill(skill: string) {
    await this.catalogFilterInput.fill(skill);
    await this.catalogFilterSubmit.click();
  }

  async openHostCard(hostName: string) {
    await this.catalogCard.filter({ hasText: hostName }).click();
  }

  /**
   * ИСПРАВЛЕНО: раньше был ОДНОРАЗОВЫЙ reload + фиксированный таймаут 8s/3s.
   * Если после reload сервер всё ещё не успел отдать слоты (SSR/гидратация,
   * нагрузка на общий стенд aiqa.su) — старая версия падала с таймаутом,
   * хотя слот появлялся секундой позже.
   * Теперь — цикл retry до общего дедлайна: короткие попытки по 2s,
   * и reload только если элемент не появился за это время.
   */
  async selectFirstSlot(retryTimeoutMs = 15_000) {
    if (await this.bookingConfirmDialog.isVisible().catch(() => false)) {
      return;
    }

    const dayChip = this.bookingCalendarDay.first();
    const deadline = Date.now() + retryTimeoutMs;

    for (;;) {
      try {
        await dayChip.waitFor({ state: "visible", timeout: 2_000 });
        break;
      } catch {
        if (Date.now() > deadline) {
          throw new Error(
            `Слот не появился за ${retryTimeoutMs}ms. URL: ${this.page.url()}`
          );
        }
        await this.page.reload();
      }
    }

    await dayChip.click();

    // Было 3_000 — маловато после клика по дню на медленном ответе бэкенда.
    const timeSlot = this.bookingCalendarTime.first();
    await timeSlot.waitFor({ state: "visible", timeout: 8_000 });
    await timeSlot.click();
  }

  async confirmBooking() {
    // ИСПРАВЛЕНО: раньше клик по кнопке ждал появления элемента неограниченно
    // (до конца всего теста). Явно ждём диалог отдельно, чтобы при падении
    // сообщение говорило "диалог не открылся" вместо непрозрачного таймаута
    // на кнопке внутри него.
    await this.bookingConfirmDialog.waitFor({ state: "visible", timeout: 10_000 });
    await this.bookingConfirmButton.click({ timeout: 10_000 });
  }

  async addSlot(time: string) {
    await this.page.goto("/pomidorqa/profile/slots");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill(time);
    await this.slotsAddSubmit.click();
  }

  async gotoBookings() {
    await this.page.goto("/pomidorqa/bookings");
  }

  bookingCardByName(participantName: string): Locator {
    return this.bookingsUpcomingSection
      .locator("[data-booking-id]")
      .filter({ hasText: participantName });
  }

  pastCardByName(participantName: string): Locator {
    return this.bookingsPastSection
      .locator("[data-booking-id]")
      .filter({ hasText: participantName });
  }

  async cancelBooking(participantName: string) {
    const card = this.bookingCardByName(participantName);
    await card.getByRole("button", { name: "Отменить" }).click();
    // ИСПРАВЛЕНО: было 10_000 — на живом стенде под нагрузкой (общий
    // aiqa.su, не мок) отмена может уйти на бэкенд дольше. Playwright's
    // waitFor({state:"hidden"}) уже покрывает и detached-случай, оставляем
    // его, но с запасом по времени.
    await this.bookingCardByName(participantName).waitFor({
      state: "hidden",
      timeout: 15_000,
    });
  }
}