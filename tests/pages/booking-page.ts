import { type Locator, type Page } from "@playwright/test";

// Всё, что относится к сценарию бронирования: слоты хоста, каталог, карточка
// человека, календарь и модалка подтверждения, «Мои встречи».
export class BookingPage {
  readonly page: Page;

  readonly slotsDateInput: Locator;
  readonly slotsTimeInput: Locator;
  readonly slotsAddSubmit: Locator;
  readonly slotsCard: Locator;
  readonly slotsFormError: Locator;

  readonly catalogFilterInput: Locator;
  readonly catalogFilterSubmit: Locator;
  readonly catalogCard: Locator;
  readonly catalogEmptyMessage: Locator;

  readonly personName: Locator;

  readonly calendarDay: Locator;
  readonly calendarTime: Locator;
  readonly calendarEmptyMessage: Locator;
  readonly calendarTimezoneHint: Locator;

  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly confirmCancelButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;

  readonly upcomingSection: Locator;
  readonly upcomingCardName: Locator;
  readonly pastSection: Locator;
  readonly cancelError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.slotsDateInput = page.locator("#pomidorqa-slots-date");
    this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
    this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
    this.slotsCard = page.locator("[data-slot-id]");
    this.slotsFormError = page.getByTestId("AddSlotForm-form").getByRole("alert");

    this.catalogFilterInput = page.getByLabel("Навык");
    this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });
    this.catalogCard = page.getByTestId("person-card");
    this.catalogEmptyMessage = page.getByText("Пока никого не нашли по этому фильтру");

    this.personName = page.getByRole("heading", { level: 1 });

    this.calendarDay = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
    this.calendarTime = page.getByRole("group", { name: "Время слотов" }).getByRole("button");
    this.calendarEmptyMessage = page.getByText("Сейчас свободных слотов нет");
    this.calendarTimezoneHint = page.getByTestId("slots-timezone");

    this.confirmDialog = page.getByRole("dialog");
    this.confirmButton = page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
    this.confirmCancelButton = page.getByRole("dialog").getByRole("button", { name: "Отмена" });
    this.confirmSuccess = page.getByRole("dialog").getByRole("status");
    this.confirmError = page.getByRole("dialog").getByRole("alert");

    this.upcomingSection = page.getByTestId("upcoming-meetings");
    this.upcomingCardName = this.upcomingSection.locator("[data-booking-id]").first().locator("p").first();
    this.pastSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Прошедшие и отменённые" }) });
    this.cancelError = page.getByTestId("cancel-error");
  }

  async gotoSlots() {
    await this.page.goto("/pomidorqa/profile/slots");
  }

  async addSlot(date: string, time: string) {
    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill(time);
    const added = this.page.waitForResponse(
      (response) =>
        response.url().endsWith("/pomidorqa/profile/slots") &&
        response.request().method() === "POST"
    );
    await this.slotsAddSubmit.click();
    await added;
    await this.slotsCard.filter({ hasText: time }).waitFor({ state: "visible" });
  }

  /**
   * Отправка формы слота без ожидания успеха: нужна там, где по требованиям (п.7)
   * слот создаваться не должен и тест сам проверяет ошибку.
   */
  async submitSlot(date: string, time: string) {
    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill(time);
    const submitted = this.page.waitForResponse(
      (response) =>
        response.url().endsWith("/pomidorqa/profile/slots") &&
        response.request().method() === "POST"
    );
    await this.slotsAddSubmit.click();
    await submitted;
  }

  slotCard(time: string): Locator {
    return this.slotsCard.filter({ hasText: time });
  }

  slotDeleteButton(time: string): Locator {
    return this.slotCard(time).getByRole("button", { name: "Удалить" });
  }

  async deleteSlot(time: string) {
    const deleted = this.page.waitForResponse(
      (response) =>
        response.url().endsWith("/pomidorqa/profile/slots") &&
        response.request().method() === "POST"
    );
    await this.slotDeleteButton(time).click();
    await deleted;
    await this.slotCard(time).waitFor({ state: "hidden" });
  }

  async gotoCatalog() {
    await this.page.goto("/pomidorqa");
  }

  async searchBySkill(tag: string) {
    await this.catalogFilterInput.fill(tag);
    await this.catalogFilterSubmit.click();
  }

  async findPerson(tag: string, name: string, timeout = 15_000) {
    const deadline = Date.now() + timeout;

    for (;;) {
      await this.gotoCatalog();
      await this.searchBySkill(tag);
      try {
        await this.personCard(name).waitFor({ state: "visible", timeout: 2_000 });
        return;
      } catch {
        if (Date.now() >= deadline) {
          throw new Error(`Специалист ${name} не появился в каталоге за ${timeout} мс`);
        }
      }
    }
  }

  personCard(name: string): Locator {
    return this.catalogCard.filter({ hasText: name });
  }

  async openPerson(name: string) {
    await this.personCard(name).click();
  }

  async selectFirstAvailableSlot(timeout = 20_000) {
    const dayChip = this.calendarDay.first();
    const deadline = Date.now() + timeout;

    for (;;) {
      try {
        await dayChip.waitFor({ state: "visible", timeout: 2_000 });
        break;
      } catch {
        if (Date.now() >= deadline) {
          throw new Error(`Свободный слот не появился за ${timeout} мс на ${this.page.url()}`);
        }
        await this.page.reload();
      }
    }

    await dayChip.click();
    await this.calendarTime.first().waitFor({ state: "visible", timeout: 8_000 });
    await this.calendarTime.first().click();
  }

  async confirmBooking() {
    const pageUrl = this.page.url();
    const confirmed = this.page.waitForResponse(
      (response) => response.url() === pageUrl && response.request().method() === "POST"
    );
    await this.confirmButton.click();
    await confirmed;
    await this.confirmSuccess.or(this.confirmError).waitFor({ state: "visible" });
  }

  async dismissBooking() {
    await this.confirmCancelButton.click();
  }

  async gotoBookings() {
    await this.page.goto("/pomidorqa/bookings");
  }

  upcomingCard(participantName: string): Locator {
    return this.upcomingSection.locator("[data-booking-id]").filter({ hasText: participantName });
  }

  pastCard(participantName: string): Locator {
    return this.pastSection.locator("[data-booking-id]").filter({ hasText: participantName });
  }

  /**
   * Нажимает «Отменить» и ждёт только ответ сервера, не требуя исчезновения карточки:
   * нужна там, где по требованиям (п.11) отмена не должна пройти.
   */
  async submitCancel(participantName: string) {
    const responded = this.page.waitForResponse(
      (response) =>
        response.url().endsWith("/pomidorqa/bookings") &&
        response.request().method() === "POST"
    );
    await this.upcomingCard(participantName).getByRole("button", { name: "Отменить" }).click();
    await responded;
  }

  async cancelBooking(participantName: string) {
    const cancelled = this.page.waitForResponse(
      (response) =>
        response.url().endsWith("/pomidorqa/bookings") &&
        response.request().method() === "POST"
    );
    await this.upcomingCard(participantName).getByRole("button", { name: "Отменить" }).click();
    await cancelled;
    await this.upcomingCard(participantName).waitFor({ state: "hidden" });
  }
}
