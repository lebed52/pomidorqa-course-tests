import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { startServer, type BookingStore } from '../../src/pyramid/mock-booking-api';

// API-уровень пирамиды: проверяем бизнес-логику бронирования через HTTP-запросы,

test.describe('API: бронирование слота PomidorQA', () => {
  let store: BookingStore;
  let api: APIRequestContext;
  let close: () => Promise<void>;

  test.beforeAll(async () => {
    const server = await startServer();
    store = server.store;
    close = server.close;
    api = await request.newContext({ baseURL: server.baseURL });
  });

  test.afterAll(async () => {
    await api.dispose();
    await close();
  });

  test('бронирование свободного слота — 201, статус confirmed (сценарий 5)', async () => {
    const slot = store.createSlot('user-host', futureIso(60));

    const response = await api.post('/bookings', {
      data: { slotId: slot.id, userId: 'user-guest' },
    });

    expect(response.status()).toBe(201);
    const booking = await response.json();
    expect(booking.status).toBe('confirmed');
    expect(booking.hostId).toBe('user-host');
    expect(booking.guestId).toBe('user-guest');
  });

  test('нельзя забронировать собственный слот — 409 cannot_book_own_slot', async () => {
    const slot = store.createSlot('user-owner', futureIso(60));

    const response = await api.post('/bookings', {
      data: { slotId: slot.id, userId: 'user-owner' },
    });

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('cannot_book_own_slot');
  });

  test('нельзя забронировать слот с датой в прошлом — 409 slot_in_past (сценарий 7)', async () => {
    const slot = store.createSlot('user-host-2', pastIso(60));

    const response = await api.post('/bookings', {
      data: { slotId: slot.id, userId: 'user-guest-2' },
    });

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('slot_in_past');
  });

  test('бронирование несуществующего слота — 404 slot_not_found', async () => {
    const response = await api.post('/bookings', {
      data: { slotId: 'no-such-slot-id', userId: 'user-guest-3' },
    });

    expect(response.status()).toBe(404);
    expect((await response.json()).error).toBe('slot_not_found');
  });

  test('повторное бронирование уже занятого слота — 409 slot_already_booked', async () => {
    const slot = store.createSlot('user-host-4', futureIso(60));
    await api.post('/bookings', { data: { slotId: slot.id, userId: 'user-guest-4a' } });

    const response = await api.post('/bookings', {
      data: { slotId: slot.id, userId: 'user-guest-4b' },
    });

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('slot_already_booked');
  });

  test('гонка двух одновременных броней на один слот — подтверждена ровно одна (сценарий 6)', async () => {
    const slot = store.createSlot('user-host-3', futureIso(60));

    const [responseA, responseB] = await Promise.all([
      api.post('/bookings', { data: { slotId: slot.id, userId: 'user-guest-a' } }),
      api.post('/bookings', { data: { slotId: slot.id, userId: 'user-guest-b' } }),
    ]);

    const statuses = [responseA.status(), responseB.status()].sort();
    expect(statuses).toEqual([201, 409]);

    const winner = responseA.status() === 201 ? responseA : responseB;
    const loser = responseA.status() === 201 ? responseB : responseA;
    expect((await winner.json()).status).toBe('confirmed');
    expect((await loser.json()).error).toBe('slot_already_booked');
  });
});

test.describe('API: регистрация участника PomidorQA', () => {
  let api: APIRequestContext;
  let close: () => Promise<void>;

  test.beforeAll(async () => {
    const server = await startServer();
    close = server.close;
    api = await request.newContext({ baseURL: server.baseURL });
  });

  test.afterAll(async () => {
    await api.dispose();
    await close();
  });

  test('регистрация нового участника — 201, аккаунт создан с переданными данными', async () => {
    const email = `new-participant-${Date.now()}@example.com`;

    const response = await api.post('/participants', { data: { name: 'Новый Участник', email } });

    expect(response.status()).toBe(201);
    const participant = await response.json();
    expect(participant.name).toBe('Новый Участник');
    expect(participant.email).toBe(email);
    expect(participant.id).toBeTruthy();
  });

  test('повторная регистрация с тем же email — 409 email_taken', async () => {
    const email = `duplicate-${Date.now()}@example.com`;
    await api.post('/participants', { data: { name: 'Первый', email } });

    const response = await api.post('/participants', { data: { name: 'Второй', email } });

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toBe('email_taken');
  });
});

function futureIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

function pastIso(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}
