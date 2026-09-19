// Форма слота принимает дату и время как локальные для часового пояса профиля
// (требования п.5), а у нового участника это Europe/Moscow. Поэтому значения для
// формы считаем в поясе владельца, а не в поясе машины, где запущен Playwright, —
// иначе тест «слот через час» на UTC-раннере уедет в прошлое и форма его отклонит.

export const DEFAULT_PROFILE_TIMEZONE = "Europe/Moscow";

export type SlotFormValues = {
  /** Значение для input[type=date]: «2026-09-16». */
  date: string;
  /** Значение для input[type=time]: «12:00». */
  time: string;
};

/**
 * Дата и время для формы слота через `offsetMs` от текущего момента,
 * посчитанные в указанном часовом поясе.
 */
export function slotFormValues(
  offsetMs: number,
  timeZone: string = DEFAULT_PROFILE_TIMEZONE
): SlotFormValues {
  const instant = new Date(Date.now() + offsetMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  // hour12: false в части движков отдаёт «24» для полуночи — приводим к «00».
  const hour = String(Number(value("hour")) % 24).padStart(2, "0");

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${hour}:${value("minute")}`,
  };
}
