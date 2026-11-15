import {
  canAccept,
  emptySnapshot,
  offerSchema,
  requestSchema,
  type Snapshot,
  type User,
} from "../domain/models";
import { validateImage, type Repository } from "./repository";

const KEY = "findit.demo.v1";
const ROLE_KEY = "findit.demo.role";
const buyer: User = {
  id: "demo-buyer",
  name: "Alex",
  email: "alex@example.com",
  role: "buyer",
};
const admin: User = {
  id: "demo-admin",
  name: "FindIt team",
  email: "team@example.com",
  role: "admin",
};
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const initial = (): Snapshot => ({
  ...emptySnapshot,
  requests: [
    {
      id: "sample-calculator",
      buyer_id: buyer.id,
      title: "Casio scientific calculator",
      category: "Study essentials",
      details:
        "Looking for an original Casio fx-991EX or a similar model for engineering classes. Must be in good working condition.",
      condition: "either",
      budget: 2500,
      difficulty:
        "I checked two shops near campus but couldn’t verify the quality.",
      needed_by: "",
      readiness: "ready",
      location: "AAU · 5 Kilo",
      contact: "@alex_demo",
      created_at: now(),
      status: "sourcing",
      confirmed_at: now(),
      close_reason: null,
      image_path: null,
    },
    {
      id: "sample-headphones",
      buyer_id: buyer.id,
      title: "Over-ear wireless headphones",
      category: "Electronics",
      details:
        "Comfortable headphones with a microphone for studying and calls. Prefer black, with at least 15 hours battery life.",
      condition: "new",
      budget: 3500,
      difficulty:
        "Too many options online and I’m unsure about battery quality.",
      needed_by: "",
      readiness: "comparing",
      location: "AAU · 5 Kilo",
      contact: "@alex_demo",
      created_at: now(),
      status: "submitted",
      confirmed_at: null,
      close_reason: null,
      image_path: null,
    },
  ],
});
function read(): Snapshot {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const value = initial();
    write(value);
    return value;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "Demo storage is damaged. Clear FindIt demo data in your browser settings to restart.",
    );
  }
}
function write(value: Snapshot) {
  localStorage.setItem(KEY, JSON.stringify(value));
}
function requireAdmin() {
  if (localStorage.getItem(ROLE_KEY) !== "admin")
    throw new Error("Admin access required.");
}
async function dataUrl(file?: File): Promise<string | undefined> {
  validateImage(file);
  if (!file) return undefined;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export const demoRepository: Repository = {
  demo: true,
  async currentUser() {
    return localStorage.getItem(ROLE_KEY) === "admin" ? admin : buyer;
  },
  async signIn() {},
  async signUp() {
    return "Demo mode is already signed in.";
  },
  async signOut() {
    localStorage.setItem(ROLE_KEY, "buyer");
  },
  async demoRole(role) {
    localStorage.setItem(ROLE_KEY, role);
  },
  async snapshot() {
    const value = read();
    return {
      ...value,
      notes: localStorage.getItem(ROLE_KEY) === "admin" ? value.notes : [],
    };
  },
  async createRequest(input, image) {
    const parsed = requestSchema.parse(input);
    const image_url = await dataUrl(image);
    const value = read();
    const requestId = id();
    value.requests.unshift({
      ...parsed,
      id: requestId,
      buyer_id: buyer.id,
      created_at: now(),
      status: "submitted",
      confirmed_at: null,
      close_reason: null,
      image_path: null,
      image_url,
    });
    write(value);
    return requestId;
  },
  async sendMessage(requestId, body) {
    if (!body.trim() || body.length > 3000)
      throw new Error("Write a message of 1–3,000 characters.");
    const value = read();
    const user = await this.currentUser();
    value.messages.push({
      id: id(),
      request_id: requestId,
      sender_id: user!.id,
      body: body.trim(),
      created_at: now(),
    });
    write(value);
  },
  async setRequestStatus(requestId, status, reason) {
    const value = read();
    const request = value.requests.find((r) => r.id === requestId)!;
    if (request.status === "matched" || request.status === "closed")
      throw new Error("This request can no longer be changed here.");
    if (status !== "closed") requireAdmin();
    if (!["closed", "sourcing", "awaiting_confirmation"].includes(status))
      throw new Error("Unsupported status.");
    if (status === "closed" && !reason?.trim())
      throw new Error("Add a reason for closing.");
    request.status = status;
    request.close_reason = reason || null;
    value.offers
      .filter((o) => o.request_id === requestId && o.status === "pending")
      .forEach((o) => {
        o.status = "withdrawn";
      });
    write(value);
  },
  async confirmInterest(requestId) {
    const value = read();
    const request = value.requests.find((r) => r.id === requestId)!;
    if (request.status !== "awaiting_confirmation")
      throw new Error("Confirmation is not needed.");
    request.confirmed_at = now();
    request.status = "sourcing";
    write(value);
  },
  async createOffer(requestId, input, image) {
    requireAdmin();
    const parsed = offerSchema.parse(input);
    const image_url = await dataUrl(image);
    const value = read();
    const request = value.requests.find((r) => r.id === requestId)!;
    if (["closed", "matched"].includes(request.status))
      throw new Error("This request is no longer open.");
    value.offers
      .filter((o) => o.request_id === requestId && o.status === "pending")
      .forEach((o) => {
        o.status = "withdrawn";
      });
    value.offers.unshift({
      ...parsed,
      id: id(),
      request_id: requestId,
      status: "pending",
      created_at: now(),
      image_path: null,
      image_url,
    });
    request.status = "offer_sent";
    write(value);
  },
  async respondOffer(offerId, accept) {
    const value = read();
    const offer = value.offers.find((o) => o.id === offerId)!;
    const request = value.requests.find((r) => r.id === offer.request_id)!;
    if (!canAccept(offer, request))
      throw new Error(
        "This offer is no longer available. Ask for a new offer.",
      );
    offer.status = accept ? "accepted" : "declined";
    request.status = accept ? "matched" : "sourcing";
    if (accept)
      value.deals.push({
        id: id(),
        offer_id: offerId,
        request_id: request.id,
        status: "accepted",
        payment: "unpaid",
        note: "",
        created_at: now(),
      });
    write(value);
  },
  async updateDeal(dealId, status, payment, note) {
    requireAdmin();
    const value = read();
    const deal = value.deals.find((d) => d.id === dealId)!;
    if (
      ["completed", "cancelled"].includes(deal.status) &&
      status !== deal.status
    )
      throw new Error("A finished deal cannot be reopened.");
    if (status === "completed" && payment !== "paid")
      throw new Error("Verify payment before completing the deal.");
    if (["completed", "cancelled"].includes(status) && !note.trim())
      throw new Error(
        "Record delivery confirmation or the cancellation reason.",
      );
    Object.assign(deal, { status, payment, note });
    write(value);
  },
  async addNote(requestId, body, cost) {
    requireAdmin();
    if (!body.trim() || cost < 0) throw new Error("Add a note and valid cost.");
    const value = read();
    value.notes.unshift({
      id: id(),
      request_id: requestId,
      body,
      cost,
      created_at: now(),
    });
    write(value);
  },
};
