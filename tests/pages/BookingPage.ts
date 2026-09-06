import { expect, type Page } from "@playwright/test";

export class BookingPage {

    constructor (readonly page: Page) {}

  // Локаторы
    
 get slotsDateInput() {return this.page.locator("#pomidorqa-slots-date");}
 get slotsTimeInput() {return this.page.locator("#pomidorqa-slots-time");}
 get slotsAddSubmit() {return this.page.getByRole("button", { name: "Добавить слот" });}
 get slotsCard() {return this.page.locator("[data-slot-id]");}
 get catalogFilterInput() {return this.page.locator("#pomidorqa-catalog-skill-filter");}
 get catalogFilterSubmit() {return this.page.getByRole("button", { name: "Найти" });}
 get catalogCard() {return this.page.getByTestId("person-card");}
 get personName() {return this.page.getByRole("heading", { level: 1 });}
 get bookingCalendarDay() { return this.page.getByRole("group", { name: "Дни со слотами" }).getByRole("button"); }
 get bookingCalendarTime() { return this.page.getByRole("group", { name: "Время слотов" }).getByRole("button"); }
 get bookingConfirmDialog() { return this.page.getByRole("dialog"); }
 get bookingConfirmButton() { return this.page.getByRole("dialog").getByRole("button", { name: "Подтвердить" }); }
 get bookingConfirmSuccess() { return this.page.getByRole("dialog").getByRole("status"); }
 get bookingConfirmError() { return this.page.getByRole("dialog").getByRole("alert"); }
 get bookingsUpcomingSection() { return this.page.getByTestId("upcoming-meetings"); }
 get bookingsCardName() { return this.bookingsUpcomingSection.locator("[data-booking-id]").first().locator("p").first(); }
 
 
  // Методы

    async gotoSlots() { await this.page.goto("/pomidorqa/profile/slots");}
    async gotoBookings () { await this.page.goto("/pomidorqa/bookings");}

  // Добавление слота на завтра
    async addSlot() {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = tomorrow.toISOString().slice(0, 10);
    await this.slotsDateInput.fill(date);
    await this.slotsTimeInput.fill("12:00");
    await this.slotsAddSubmit.click();
    }

    //Поиск слота по навыку
    async searchBySkill(skillTag: string) {
    await this.catalogFilterInput.fill(skillTag);
    await this.catalogFilterSubmit.click();
    }

    //Открывает карточку хоста
    async openCard (text: string) {
    await this.catalogCard.filter({ hasText: text }).click();    
    } 

    //Кликает по дню и времени в календаре слотов
    async selectSlot () {
    await expect(async () => {
        const dayChip = this.bookingCalendarDay.first();
        const isVisible = await dayChip.isVisible().catch(() => false);
          if (!isVisible) {
            await this.page.reload();
          }
          await expect(dayChip).toBeVisible();
        }).toPass({ timeout: 10_000 });
    
        await this.bookingCalendarDay.first().click();
        await this.bookingCalendarTime.first().click();     
    }
    //Успешное подтверждение бронирования
    async bookingConfirm () {
      await this.bookingConfirmButton.click();
      await expect(this.bookingConfirmSuccess.or(this.bookingConfirmError)).toBeVisible({ timeout: 15_000 });
          if (await this.bookingConfirmError.isVisible().catch(() => false)) {
            const errorText = await this.bookingConfirmError.textContent();
            throw new Error(`Бронирование не удалось: ${errorText}`);
          }
    }
    //Ошибка при подтверждении бронирования
    async bookingFail () {
      await this.bookingConfirmButton.click();
      await expect(this.bookingConfirmSuccess.or(this.bookingConfirmError)).toBeVisible({ timeout: 15_000 });
          // Полярность наоборот относительно гостя 1: ошибка — ожидаемый результат
          if (await this.bookingConfirmSuccess.isVisible().catch(() => false)) {
            throw new Error("Слот должен был быть занят, но бронирование прошло успешно");
          }
     }

}          