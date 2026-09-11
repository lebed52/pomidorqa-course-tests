import { type Page, type Locator } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export type BookingResult =
  | { status: "success" }
  | { status: "error"; message: string };

export class BookingPage {
  private readonly catalogFilterInput: Locator;
  private readonly catalogFilterButton: Locator;

  readonly personCards: Locator;
  readonly personName: Locator;

  private readonly dayChip: Locator;
  private readonly timeChip: Locator;

  readonly confirmDialog: Locator;
  private readonly confirmButton: Locator;
  readonly confirmSuccess: Locator;
  readonly confirmError: Locator;

  private readonly bookingsSection: Locator;
  private readonly upcomingBookings: Locator;

  private readonly pastMeetingsSection: Locator;
  private readonly pastBookings: Locator;

  constructor(readonly page: Page) {
    this.catalogFilterInput = page.locator(
      "#pomidorqa-catalog-skill-filter",
    );

    this.catalogFilterButton = page.getByRole("button", {
      name: "Найти",
    });

    this.personCards = page.getByTestId("person-card");

    this.personName = page.getByRole("heading", {
      level: 1,
    });

    this.dayChip = page
      .getByRole("group", { name: "Дни со слотами" })
      .getByRole("button")
      .first();

    this.timeChip = page
      .getByRole("group", { name: "Время слотов" })
      .getByRole("button")
      .first();

    this.confirmDialog = page.getByRole("dialog");

    this.confirmButton = this.confirmDialog.getByRole("button", {
      name: "Подтвердить",
    });

    this.confirmSuccess = this.confirmDialog.getByRole("status");
    this.confirmError = this.confirmDialog.getByRole("alert");

    this.bookingsSection = page.getByTestId("upcoming-meetings");

    this.upcomingBookings =
      this.bookingsSection.locator("[data-booking-id]");

    this.pastMeetingsSection = page
      .locator("section")
      .filter({ hasText: "Прошедшие и отменённые" });

    this.pastBookings =
      this.pastMeetingsSection.locator("[data-booking-id]");
  }

  async goToCatalog(): Promise<void> {
    await this.page.goto(ROUTES.catalog);
  }

  async searchCatalog(skillTag: string): Promise<void> {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterButton.click();
  }

  async waitForPersonInCatalog(
    name: string,
    timeoutMs = 30_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const personCard = this.personCard(name);
    let reloadCount = 0;

    while (Date.now() < deadline) {
      const remainingMs = deadline - Date.now();

      try {
        await personCard.waitFor({
          state: "visible",
          timeout: Math.max(
            1,
            Math.min(2_000, remainingMs),
          ),
        });

        return;
      } catch {
        if (Date.now() >= deadline) {
          break;
        }
      }

      reloadCount += 1;

      const reloadTimeout = Math.max(
        1,
        Math.min(
          15_000,
          deadline - Date.now(),
        ),
      );

      try {
        await this.page.reload({
          waitUntil: "domcontentloaded",
          timeout: reloadTimeout,
        });
      } catch {
        if (Date.now() >= deadline) {
          break;
        }
      }
    }

    throw new Error(
      `Участник ${name} не появился в каталоге ` +
        `за ${timeoutMs} мс после ${reloadCount} reload. ` +
        `URL: ${this.page.url()}`,
    );
  }

  personCard(name: string): Locator {
    return this.personCards.filter({
      hasText: name,
    });
  }

  async openPerson(name: string): Promise<void> {
    const personCard = this.personCard(name);

    await Promise.all([
      this.page.waitForURL(
        (url) => url.pathname.startsWith("/pomidorqa/people/"),
        { waitUntil: "load" },
      ),
      personCard.click(),
    ]);

    await this.personName.waitFor({
      state: "visible",
    });
  }

  private async waitForFirstAvailableDay(
    timeoutMs = 10_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let reloadCount = 0;

    while (Date.now() < deadline) {
      const remainingMs = deadline - Date.now();

      try {
        await this.dayChip.waitFor({
          state: "visible",
          timeout: Math.max(
            1,
            Math.min(2_000, remainingMs),
          ),
        });

        return;
      } catch {
        if (Date.now() >= deadline) {
          break;
        }

        reloadCount += 1;

        await this.page.reload({
          waitUntil: "load",
        });
      }
    }

    throw new Error(
      `Слот не появился за ${timeoutMs} мс после ` +
        `${reloadCount} reload. URL: ${this.page.url()}`,
    );
  }

  async pickFirstSlot(
    retryTimeoutMs = 10_000,
  ): Promise<void> {
    if (
      await this.confirmDialog
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    await this.waitForFirstAvailableDay(retryTimeoutMs);

    await this.dayChip.click();

    await this.timeChip.waitFor({
      state: "visible",
      timeout: 5_000,
    });

    await this.timeChip.click();
  }

  async confirmBooking(): Promise<void> {
    await this.confirmButton.waitFor({
      state: "visible",
    });

    await this.confirmButton.click();
  }

  async waitForBookingResult(
    timeout = 15_000,
  ): Promise<BookingResult> {
    await this.confirmSuccess
      .or(this.confirmError)
      .waitFor({
        state: "visible",
        timeout,
      });

    if (
      await this.confirmSuccess
        .isVisible()
        .catch(() => false)
    ) {
      return {
        status: "success",
      };
    }

    return {
      status: "error",
      message:
        (await this.confirmError.textContent())?.trim() ||
        "Неизвестная ошибка бронирования",
    };
  }

  async goToBookings(): Promise<void> {
    await this.page.goto(ROUTES.bookings);
  }

  upcomingBookingByParticipant(name: string): Locator {
    return this.upcomingBookings.filter({
      hasText: name,
    });
  }

  pastBookingByParticipant(name: string): Locator {
    return this.pastBookings.filter({
      hasText: name,
    });
  }

  async cancelBookingWith(
    name: string,
  ): Promise<void> {
    const booking =
      this.upcomingBookingByParticipant(name);

    const cancelResponse = this.page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === ROUTES.bookings &&
        response.request().method() === "POST",
      { timeout: 15_000 },
    );

    const [response] = await Promise.all([
      cancelResponse,
      booking
        .getByRole("button", { name: "Отменить" })
        .click(),
    ]);

    if (response.status() >= 400) {
      throw new Error(
        `Отмена встречи с ${name} завершилась с ` +
          `HTTP ${response.status()} ${response.statusText()}`,
      );
    }

    await booking.waitFor({
      state: "hidden",
      timeout: 10_000,
    });
  }
}
