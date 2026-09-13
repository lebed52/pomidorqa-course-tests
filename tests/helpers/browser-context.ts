import type { BrowserContextOptions } from "@playwright/test";

// Фиксируем таймзону для стабильного отображения времени слотов в тестах.
export const contextOptions: BrowserContextOptions = {
  timezoneId: "UTC",
};
