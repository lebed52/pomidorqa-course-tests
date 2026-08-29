import { expect, type Page, type Locator } from "@playwright/test";

// Page Object для сценариев бронирования PomidorQA:
// профиль хоста (навык, слот), каталог, страница хоста, модалка подтверждения, «Мои встречи».
// Селекторы сняты с живого стенда aiqa.su: data-testid вида PomidorqaProfile-*/PomidorqaCatalog-*
// на стенде отсутствуют, поэтому используются role/placeholder/aria-селекторы.
export class BookingPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Профиль хоста ---

  async addCanHelpSkill(skillTag: string) {
    const page = this.page;
    await page.goto("/pomidorqa/profile");
    await page.getByRole("textbox", { name: "Навык" }).fill(skillTag);
    await page.getByLabel("Тип").selectOption("can_help");
    await page.getByRole("button", { name: "Добавить" }).click();
    await expect(
      page.locator(`[data-skill-tag="${skillTag}"]`)
    ).toBeVisible();
  }

  async addSlotTomorrow(time: string) {
    const page = this.page;
    await page.goto("/pomidorqa/profile/slots");
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await page.locator('input[type="date"]').fill(date);
    await page.locator('input[type="time"]').fill(time);
    await page.getByRole("button", { name: "Добавить слот" }).click();
    await expect(page.locator('[data-slot-status="free"]').first()).toBeVisible();
  }

  // --- Каталог ---

  hostCard(hostName: string): Locator {
    return this.page.getByTestId("person-card").filter({ hasText: hostName });
  }

  // ВНИМАНИЕ: каталог на стенде кэшируется на несколько минут,
  // свежезарегистрированный хост появляется в выдаче не сразу.
  async findHostBySkill(skillTag: string, hostName: string) {
    const page = this.page;
    await page.goto(`/pomidorqa?skill=${encodeURIComponent(skillTag)}`);
    await page
      .getByPlaceholder("Playwright, SQL, собеседования")
      .fill(skillTag);
    await page.getByRole("button", { name: "Найти" }).click();
    await expect(this.hostCard(hostName)).toBeVisible();
  }

  async openHostCard(hostName: string) {
    await this.hostCard(hostName).first().click();
    await expect(
      this.page.getByRole("heading", { level: 1, name: hostName })
    ).toBeVisible();
  }

  // --- Страница хоста: календарь слотов ---

  // Дни/время подгружаются не сразу — перезагружаем страницу, пока не отрисуются
  async openFirstSlot() {
    const page = this.page;
    const dayChip = page.locator("[data-date]").first();
    await expect(async () => {
      if (!(await dayChip.isVisible().catch(() => false))) {
        await page.reload();
      }
      await expect(dayChip).toBeVisible();
    }).toPass({ timeout: 10_000 });

    await dayChip.click();
    await page.locator("[data-slot-id]").first().click();
    await expect(
      page.getByRole("dialog").getByText("Подтвердить бронирование?")
    ).toBeVisible();
  }

  // --- Модалка подтверждения ---

  // Подтверждает бронирование и ждёт исход: "success" | "error" (текст — в message)
  async confirmBooking(): Promise<{
    outcome: "success" | "error";
    message?: string;
  }> {
    const page = this.page;
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Подтвердить" }).click();

    // После сабмита модалка либо исчезает (успех), либо показывает текст ошибки
    await expect(dialog.or(page.getByText(/отмен|занят|ошибк/i))).toBeVisible({
      timeout: 15_000,
    });
    const dialogVisible = await dialog.isVisible().catch(() => false);
    if (dialogVisible) {
      const text = (await dialog.textContent()) ?? "";
      if (/занят|ошибк|не удалось/i.test(text)) {
        return { outcome: "error", message: text.trim() };
      }
    }
    return { outcome: "success" };
  }

  // --- «Мои встречи» ---

  async expectUpcomingBookingWithName(name: string) {
    const page = this.page;
    await expect(async () => {
      await page.goto("/pomidorqa/bookings");
      const upcoming = page.locator("#upcoming-meetings, [data-testid='upcoming-meetings']").first();
      const section = (await upcoming.count()) > 0 ? upcoming : page.getByText("Ближайшие").locator("..");
      await expect(section).toContainText(name);
    }).toPass({ timeout: 10_000 });
  }
}
