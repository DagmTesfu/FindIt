import { createClient } from "@supabase/supabase-js";
import {
  offerSchema,
  requestSchema,
  type Snapshot,
  type User,
} from "../domain/models";
import { validateImage, type Repository } from "./repository";

export function createSupabaseRepository(url: string, key: string): Repository {
  const client = createClient(url, key);
  async function rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error(error.message);
    return data;
  }
  async function upload(file?: File) {
    validateImage(file);
    if (!file) return null;
    const { data } = await client.auth.getUser();
    if (!data.user) throw new Error("Sign in to upload an image.");
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${data.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage
      .from("request-images")
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path;
  }
  async function withUpload<T>(
    file: File | undefined,
    action: (path: string | null) => Promise<T>,
  ) {
    const path = await upload(file);
    try {
      return await action(path);
    } catch (error) {
      if (path) await client.storage.from("request-images").remove([path]);
      throw error;
    }
  }
  return {
    demo: false,
    async currentUser() {
      const {
        data: { session },
        error,
      } = await client.auth.getSession();
      if (error) throw error;
      if (!session) return null;
      const { data, error: profileError } = await client
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (profileError) throw profileError;
      return {
        id: data.id,
        name: data.name,
        email: session.user.email || "",
        role: data.role,
      } as User;
    },
    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    async signUp(name, email, password) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin + "/app",
        },
      });
      if (error) throw error;
      return data.session
        ? "Your account is ready. Open your requests."
        : "Check your email to confirm your account, then sign in.";
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    async snapshot() {
      const user = await this.currentUser();
      if (!user)
        return { requests: [], messages: [], offers: [], deals: [], notes: [] };
      const tables = [
        "requests",
        "messages",
        "offers",
        "deals",
        ...(user.role === "admin" ? ["sourcing_notes"] : []),
      ];
      const results = await Promise.all(
        tables.map((table) =>
          client
            .from(table)
            .select("*")
            .order("created_at", { ascending: false }),
        ),
      );
      results.forEach((r) => {
        if (r.error) throw r.error;
      });
      const snapshot = {
        requests: results[0].data,
        messages: results[1].data,
        offers: results[2].data,
        deals: results[3].data,
        notes: results[4]?.data || [],
      } as unknown as Snapshot;
      await Promise.all(
        [...snapshot.requests, ...snapshot.offers].map(async (item) => {
          if (item.image_path) {
            const { data, error } = await client.storage
              .from("request-images")
              .createSignedUrl(item.image_path, 3600);
            if (!error) item.image_url = data.signedUrl;
          }
        }),
      );
      return snapshot;
    },
    async createRequest(input, image) {
      const parsed = requestSchema.parse(input);
      return withUpload(image, async (image_path) => {
        const user = await this.currentUser();
        if (!user) throw new Error("Sign in first.");
        const { data, error } = await client
          .from("requests")
          .insert({
            ...parsed,
            needed_by: parsed.needed_by || null,
            buyer_id: user.id,
            image_path,
          })
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      });
    },
    async sendMessage(requestId, body) {
      const user = await this.currentUser();
      const { error } = await client
        .from("messages")
        .insert({
          request_id: requestId,
          sender_id: user?.id,
          body: body.trim(),
        });
      if (error) throw error;
    },
    async setRequestStatus(requestId, status, reason) {
      await rpc("set_request_status", {
        p_request: requestId,
        p_status: status,
        p_reason: reason || null,
      });
    },
    async confirmInterest(requestId) {
      await rpc("confirm_interest", { p_request: requestId });
    },
    async createOffer(requestId, input, image) {
      const parsed = offerSchema.parse(input);
      await withUpload(image, (path) =>
        rpc("create_offer", {
          p_request: requestId,
          p_offer: { ...parsed, image_path: path },
        }),
      );
    },
    async respondOffer(offerId, accept) {
      await rpc("respond_offer", { p_offer: offerId, p_accept: accept });
    },
    async updateDeal(dealId, status, payment, note) {
      await rpc("update_deal", {
        p_deal: dealId,
        p_status: status,
        p_payment: payment,
        p_note: note,
      });
    },
    async addNote(requestId, body, cost) {
      const { error } = await client
        .from("sourcing_notes")
        .insert({ request_id: requestId, body, cost });
      if (error) throw error;
    },
  };
}
