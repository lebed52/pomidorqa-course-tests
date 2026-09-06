import { type Locator, type Page } from "@playwright/test";

// Урок 10, ⭐: Page Object для сценария бронирования.
// Один класс на весь путь: слоты хоста → каталог → карточка человека →
// календарь → диалог подтверждения → «Мои встречи».
// Пользователь и регистрация — в helpers/user.ts.

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

  // «Мои встречи»: имя человека на первой карточке
  readonly firstBookingCardName: Locator;

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

    this.firstBookingCardName = this.bookingsUpcomingSection
      .locator("[data-booking-id]")
      .first()
      .locator("p")
      .first();
  }

  // Карточка конкретного человека в каталоге: фильтр по имени —
  // логика поиска спрятана в класс, спека зовёт метод.
  personCardByName(name: string): Locator {
    return this.page.getByTestId("person-card").filter({ hasText: name });
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

  async openBookings() {
    await this.page.goto(BOOKINGS_URL);
  }

  // Отмена встречи: жмём «Отменить» внутри карточки и ждём, пока карточка
  // уйдёт из «Ближайших», — это признак, что сервер принял отмену.
  // Кнопка ищется внутри карточки, а не на всей странице: в списке может
  // быть несколько встреч, у каждой своя кнопка «Отменить».
  async cancelBooking(participantName: string) {
    const card = this.bookingCardByName(participantName);
    await card.getByRole("button", { name: "Отменить" }).click();
    await card.waitFor({ state: "hidden", timeout: 10_000 });
  }
}
