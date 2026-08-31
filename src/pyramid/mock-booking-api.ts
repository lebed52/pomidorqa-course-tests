import http from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

// Мини-имитация бизнес-правил бронирования PomidorQA (см. pomidorqa_book_slot() в
// aiqa-app/supabase-pomidorqa.sql) в виде обычного HTTP API. На эфире показываем API-уровень

export interface Slot {
  id: string;
  ownerId: string;
  startTime: string; // ISO
  status: "free" | "booked";
}

export interface Booking {
  id: string;
  slotId: string;
  hostId: string;
  guestId: string;
  status: "confirmed" | "cancelled";
}

export interface Participant {
  id: string;
  name: string;
  email: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string
  ) {
    super(code);
  }
}

export class BookingStore {
  private slots = new Map<string, Slot>();
  private bookings = new Map<string, Booking>();
  private queues = new Map<string, Promise<unknown>>();
  private participantsByEmail = new Map<string, Participant>();

  createSlot(ownerId: string, startTime: string): Slot {
    const slot: Slot = { id: randomUUID(), ownerId, startTime, status: "free" };
    this.slots.set(slot.id, slot);
    return slot;
  }

  /**
   * Регистрация нового участника (сценарий 4 из ДЗ). Email — уникальный ключ,
   * как и в реальной регистрации PomidorQA через Supabase Auth.
   */
  registerParticipant(name: string, email: string): Participant {
    if (this.participantsByEmail.has(email)) throw new ApiError(409, "email_taken");

    const participant: Participant = { id: randomUUID(), name, email };
    this.participantsByEmail.set(email, participant);
    return participant;
  }

  /**
   * Очередь на конкретный слот имитирует `FOR UPDATE` из реальной SQL-функции:
   * второй одновременный вызов на тот же слот дожидается первого и видит уже актуальный статус.
   * Это гарантирует, что при гонке подтверждённой останется ровно одна бронь (сценарий 6 из ДЗ).
   */
  bookSlot(slotId: string, userId: string): Promise<Booking> {
    const previous = this.queues.get(slotId) ?? Promise.resolve();
    const task = previous.then(() => this.doBook(slotId, userId));
    this.queues.set(slotId, task.catch(() => undefined));
    return task;
  }

  private async doBook(slotId: string, userId: string): Promise<Booking> {
    // Искусственная задержка — без неё гонка на localhost отрабатывает слишком быстро,
    // чтобы её было видно в демонстрации.
    await new Promise((resolve) => setTimeout(resolve, 30));

    const slot = this.slots.get(slotId);
    if (!slot) throw new ApiError(404, "slot_not_found");
    if (slot.ownerId === userId) throw new ApiError(409, "cannot_book_own_slot");
    if (slot.status !== "free") throw new ApiError(409, "slot_already_booked");
    if (new Date(slot.startTime).getTime() <= Date.now()) throw new ApiError(409, "slot_in_past");

    slot.status = "booked";
    const booking: Booking = {
      id: randomUUID(),
      slotId,
      hostId: slot.ownerId,
      guestId: userId,
      status: "confirmed",
    };
    this.bookings.set(booking.id, booking);
    return booking;
  }
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createServer(store: BookingStore) {
  return http.createServer(async (req, res) => {
    try {
      const body = await readJsonBody(req);

      if (req.method === "POST" && req.url === "/bookings") {
        const booking = await store.bookSlot(String(body.slotId), String(body.userId));
        return send(res, 201, booking);
      }

      if (req.method === "POST" && req.url === "/participants") {
        const participant = store.registerParticipant(String(body.name), String(body.email));
        return send(res, 201, participant);
      }

      return send(res, 404, { error: "not_found" });
    } catch (err) {
      if (err instanceof ApiError) return send(res, err.status, { error: err.code });
      return send(res, 500, { error: "internal_error" });
    }
  });
}

export async function startServer(): Promise<{
  baseURL: string;
  store: BookingStore;
  close: () => Promise<void>;
}> {
  const store = new BookingStore();
  const server = createServer(store);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseURL: `http://127.0.0.1:${port}`,
    store,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
