import { Browser } from "@playwright/test";
import { BookingPage } from "../pages/booking-page";

async function createBookingContext(browser: Browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const bookingPage = new BookingPage(page);
    return { context, page, bookingPage };
}

export async function createHostAndGuestsContexts(browser: Browser) {
    const [hostCtx, guestCtx, guest2Ctx] = await Promise.all([
        createBookingContext(browser),
        createBookingContext(browser),
        createBookingContext(browser),
    ]);
    return { hostCtx, guestCtx, guest2Ctx };
}

export async function closeHostGuestContexts(contexts: Awaited<ReturnType<typeof createHostAndGuestsContexts>>) {
    await Promise.all([
        contexts.hostCtx.context.close(),
        contexts.guestCtx.context.close(),
        contexts.guest2Ctx.context.close(),
    ]);
}
