import { z } from "zod";

export type Role = "buyer" | "admin";
export type User = { id: string; name: string; email: string; role: Role };
export const categories = [
  "Electronics",
  "Study essentials",
  "Clothing & accessories",
  "Room & living",
  "Other",
] as const;
export const requestSchema = z.object({
  title: z.string().trim().min(3, "Give the item a clear name.").max(120),
  category: z.enum(categories),
  details: z
    .string()
    .trim()
    .min(10, "Add a few details so we can find the right item.")
    .max(3000),
  condition: z.enum(["new", "used", "either"]),
  budget: z.coerce
    .number()
    .positive("Enter a budget greater than zero.")
    .max(10000000),
  difficulty: z
    .string()
    .trim()
    .min(5, "Tell us what has been difficult.")
    .max(1000),
  needed_by: z
    .string()
    .max(10)
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Choose a valid date."),
  readiness: z.enum(["ready", "comparing", "researching"]),
  location: z
    .string()
    .trim()
    .min(2, "Enter your campus or general area.")
    .max(120),
  contact: z
    .string()
    .trim()
    .min(3, "Add your Telegram username or phone.")
    .max(120),
});
export type RequestInput = z.infer<typeof requestSchema>;
export type RequestStatus =
  | "submitted"
  | "awaiting_confirmation"
  | "sourcing"
  | "offer_sent"
  | "matched"
  | "closed";
export type BuyingRequest = RequestInput & {
  id: string;
  buyer_id: string;
  created_at: string;
  status: RequestStatus;
  confirmed_at: string | null;
  close_reason: string | null;
  image_path: string | null;
  image_url?: string;
};
export type Message = {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export const offerSchema = z.object({
  item: z.string().trim().min(3).max(120),
  details: z.string().trim().min(10).max(3000),
  total: z.coerce.number().positive().max(10000000),
  fulfillment: z.string().trim().min(5).max(1000),
  terms: z.string().trim().min(5).max(2000),
  expires_at: z
    .string()
    .refine(
      (v) => Number.isFinite(Date.parse(v)) && Date.parse(v) > Date.now(),
      "Expiry must be in the future.",
    ),
});
export type OfferInput = z.infer<typeof offerSchema>;
export type Offer = OfferInput & {
  id: string;
  request_id: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  created_at: string;
  image_path: string | null;
  image_url?: string;
};
export type Deal = {
  id: string;
  offer_id: string;
  request_id: string;
  status: "accepted" | "arranging" | "ready" | "completed" | "cancelled";
  payment: "unpaid" | "pending_verification" | "paid" | "refunded";
  note: string;
  created_at: string;
};
export type SourcingNote = {
  id: string;
  request_id: string;
  body: string;
  cost: number;
  created_at: string;
};
export type Snapshot = {
  requests: BuyingRequest[];
  messages: Message[];
  offers: Offer[];
  deals: Deal[];
  notes: SourcingNote[];
};
export const emptySnapshot: Snapshot = {
  requests: [],
  messages: [],
  offers: [],
  deals: [],
  notes: [],
};
export const statusLabels: Record<RequestStatus, string> = {
  submitted: "Submitted",
  awaiting_confirmation: "Confirm interest",
  sourcing: "Sourcing",
  offer_sent: "Offer ready",
  matched: "Matched",
  closed: "Closed",
};
export const money = (value: number) =>
  `${new Intl.NumberFormat("en-ET", { maximumFractionDigits: 2 }).format(value)} birr`;
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(value),
  );
export const canAccept = (offer: Offer, request: BuyingRequest) =>
  offer.status === "pending" &&
  Date.parse(offer.expires_at) > Date.now() &&
  request.status === "offer_sent";
