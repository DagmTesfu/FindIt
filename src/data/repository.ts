import type {
  Deal,
  OfferInput,
  RequestInput,
  RequestStatus,
  Snapshot,
  User,
} from "../domain/models";

// UI depends on this contract, not a vendor SDK. Replace the adapter to migrate backends.
export interface Repository {
  readonly demo: boolean;
  currentUser(): Promise<User | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<string>;
  signOut(): Promise<void>;
  demoRole?(role: "buyer" | "admin"): Promise<void>;
  snapshot(): Promise<Snapshot>;
  createRequest(input: RequestInput, image?: File): Promise<string>;
  sendMessage(requestId: string, body: string): Promise<void>;
  setRequestStatus(
    requestId: string,
    status: RequestStatus,
    reason?: string,
  ): Promise<void>;
  confirmInterest(requestId: string): Promise<void>;
  createOffer(
    requestId: string,
    input: OfferInput,
    image?: File,
  ): Promise<void>;
  respondOffer(offerId: string, accept: boolean): Promise<void>;
  updateDeal(
    dealId: string,
    status: Deal["status"],
    payment: Deal["payment"],
    note: string,
  ): Promise<void>;
  addNote(requestId: string, body: string, cost: number): Promise<void>;
}

export function validateImage(file?: File) {
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Please choose an image smaller than 5 MB.");
}
