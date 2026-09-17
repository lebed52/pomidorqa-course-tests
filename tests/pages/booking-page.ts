import { type Locator, type Page } from "@playwright/test";

// Урок 10, ⭐: Page Object для сценария бронирования.
// Один класс на весь путь: слоты хоста → каталог → карточка человека →
// календарь → диалог подтверждения → «Мои встречи».
// Пользователь и регистрация — в helpers/user.ts.

const CATALOG_URL = "/pomidorqa";
const SLOTS_URL = "/pomidorqa/profile/slots";
const BOOKINGS_URL = "/pomidorqa/bookings";

export class BookingPage {
  // Слоты хоста: форма добавления свободного слота
  readonly slotsDateInput: Locator;
  readonly slotsTimeInput: Locator;
  readonly slotsAddSubmit: Locator;
  readonly slotsCard: Locator;

  // Каталог: поиск человека по навыку
  readonly catalogFilterInput: Locator;
  readonly catalogFilterSubmit: Locator;

  // Каталог: выдача целиком и её пустое состояние
  readonly personCards: Locator;
  readonly catalogEmpty: Locator;

  // Карточка человека
  readonly personName: Locator;

  // Календарь слотов на карточке
  readonly calendarDay: Locator;
  readonly calendarTime: Locator;

  // Диалог подтверждения бронирования
  readonly confirmDialog: Locator;
  readonly confirmButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;

  // «Мои встречи»: секция «Ближайшие» — предстоящие встречи
  readonly bookingsUpcomingSection: Locator;

  // «Мои встречи»: секция «Прошедшие и отменённые» — сюда карточка
  // попадает после отмены встречи
  readonly bookingsPastSection: Locator;

  constructor(private readonly page: Page) {
    this.slotsDateInput = page.locator("#pomidorqa-slots-date");
    this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
    this.slotsAddSubmit = page.getByRole("button", { name: "Добавить слот" });
    this.slotsCard = page.locator("[data-slot-id]");

    this.catalogFilterInput = page.locator("#pomidorqa-catalog-skill-filter");
    this.catalogFilterSubmit = page.getByRole("button", { name: "Найти" });

    // У пустой выдачи нет testid — единственный якорь текст плейсхолдера.
    this.personCards = page.getByTestId("person-card");
    this.catalogEmpty = page.getByText("Пока никого не нашли");

    this.personName = page.getByRole("heading", { level: 1 });

    this.calendarDay = page.getByRole("group", { name: "Дни со слотами" }).getByRole("button");
    this.calendarTime = page.getByRole("group", { name: "Время слотов" }).getByRole("button");

    this.confirmDialog = page.getByRole("dialog");
    this.confirmButton = page.getByRole("dialog").getByRole("button", { name: "Подтвердить" });
    this.confirmSuccess = page.getByRole("dialog").getByRole("status");
    this.confirmError = page.getByRole("dialog").getByRole("alert");

    this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
    this.bookingsPastSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Прошедшие и отменённые" }) });
  }

  // Карточка конкретного человека в каталоге: фильтр по имени —
  // логика поиска спрятана в класс, спека зовёт метод.
  personCardByName(name: string): Locator {
    return this.personCards.filter({ hasText: name });
  }

  // Карточка встречи по имени второго участника: гость ищет по имени хоста,
  // хост — по имени гостя. Без .first(): имена уникальны за счёт runId,
  // и тесту важна именно его встреча, а не чужая с общего стенда.
  bookingCardByName(participantName: string): Locator {
    return this.bookingsUpcomingSection
      .locator("[data-booking-id]")
      .filter({ hasText: participantName });
  }

  // Та же встреча, но в секции «Прошедшие и отменённые»
  pastCardByName(participantName: string): Locator {
    return this.bookingsPastSection
      .locator("[data-booking-id]")
      .filter({ hasText: participantName });
  }

  async openSlots() {
    await this.page.goto(SLOTS_URL);
  }

  async addSlot(date: string, time: string) {
    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill(time);
    await this.slotsAddSubmit.click();
  }

  async openCatalog() {
    await this.page.goto(CATALOG_URL);
  }

  async searchInCatalog(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterSubmit.click();
  }

  async openPersonCard(name: string) {
    await this.personCardByName(name).click();
  }

  // Календарь на карточке догидратируется не сразу: если дней ещё нет —
  // перезагружаем страницу. Повторные попытки делает toPass в спеке.
  async ensureCalendarLoaded() {
    if (!(await this.calendarDay.first().isVisible().catch(() => false))) {
      await this.page.reload();
    }
  }

  async selectFirstSlot() {
    await this.calendarDay.first().click();
    await this.calendarTime.first().click();
  }

  async confirmBooking() {
    await this.confirmButton.click();
  }

  async openBookings() {
    await this.page.goto(BOOKINGS_URL);
  }

  // Встреча появляется в «Моих встречах» не сразу после подтверждения:
  // если карточки ещё нет — перезагружаем страницу, список приходит
  // при загрузке. Повторные попытки делает toPass в спеке.
  async openBookingsUntilCardVisible(participantName: string) {
    await this.openBookings();
    if (!(await this.bookingCardByName(participantName).isVisible().catch(() => false))) {
      await this.page.reload();
    }
  }

  // Отмена встречи: кнопка ищется внутри карточки, а не на всей странице —
  // в списке может быть несколько встреч, у каждой своя кнопка «Отменить».
  // Страница только кликает; что карточка ушла из «Ближайших», проверяет тест.
  async cancelBooking(participantName: string) {
    const card = this.bookingCardByName(participantName);
    await card.getByRole("button", { name: "Отменить" }).click();
  }

  async reload() {
    await this.page.reload();
  }
}
