import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { repository } from "./data";
import { emptySnapshot, type Snapshot, type User } from "./domain/models";
import type { Repository } from "./data/repository";

type AppState = {
  repo: Repository;
  user: User | null;
  data: Snapshot;
  loading: boolean;
  refresh: () => Promise<void>;
  run: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
  busy: boolean;
};
const Context = createContext<AppState | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("App provider missing");
  return value;
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const refresh = useCallback(async () => {
    if (!repository) return;
    const nextUser = await repository.currentUser();
    setUser(nextUser);
    setData(nextUser ? await repository.snapshot() : emptySnapshot);
  }, []);
  useEffect(() => {
    refresh()
      .catch((error) => setNotice({ text: error.message, error: true }))
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible")
        refresh().catch(() => {
          /* Foreground actions surface actionable errors; background refresh retains current data. */
        });
    };
    const timer = window.setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await refresh();
      if (success) setNotice({ text: success, error: false });
      return true;
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        error: true,
      });
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!repository)
    return (
      <main className="setup">
        <div className="brand">
          FindIt<span>.</span>
        </div>
        <h1>Let’s connect your workspace.</h1>
        <p>
          Set the Supabase URL and publishable key in your environment, or
          explicitly enable demo mode for a local preview. See the project
          README for setup.
        </p>
      </main>
    );
  return (
    <Context.Provider
      value={{ repo: repository, user, data, loading, refresh, run, busy }}
    >
      {children}
      {notice && (
        <div
          className={`toast ${notice.error ? "error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
