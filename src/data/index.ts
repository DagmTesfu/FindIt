import { demoRepository } from "./demo";
import { createSupabaseRepository } from "./supabase";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Never silently fall back to fake data on a deployed production app.
export const repository =
  url && key
    ? createSupabaseRepository(url, key)
    : import.meta.env.VITE_DEMO_MODE === "true"
      ? demoRepository
      : null;
