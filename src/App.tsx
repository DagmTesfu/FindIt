import { Landing } from "./pages/Landing";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardList,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { AppProvider, useApp } from "./app-context";
import { Badge, Empty, Field } from "./components/ui";
import { categories, dateLabel, money } from "./domain/models";
import { RequestForm } from "./pages/RequestForm";
import { RequestDetail } from "./pages/RequestDetail";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="FindIt home">
      <span className="brand-icon">
        <ArrowUpRight size={23} strokeWidth={3} />
      </span>
      FindIt<span className="brand-dot">.</span>
    </Link>
  );
}
export function DemoBanner() {
  const { repo, user, run, busy } = useApp();
  return repo.demo ? (
    <div className="demo-banner">
      <span>
        <strong>Demo workspace</strong> · Sample data saved only in this
        browser. No real orders.
      </span>
      <button
        disabled={busy}
        onClick={() =>
          run(() => repo.demoRole!(user?.role === "admin" ? "buyer" : "admin"))
        }
      >
        Try {user?.role === "admin" ? "student" : "admin"} view{" "}
        <ArrowRight size={13} />
      </button>
    </div>
  ) : null;
}
function Auth() {
  const { user, repo, run, busy, loading } = useApp();
  const [signup, setSignup] = useState(false);
  const navigate = useNavigate();
  if (loading) return <div className="loading">Opening FindIt…</div>;
  if (user) return <Navigate to="/app" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let result = "";
    const ok = await run(async () => {
      if (signup)
        result = await repo.signUp(
          String(form.get("name")),
          String(form.get("email")),
          String(form.get("password")),
        );
      else
        await repo.signIn(
          String(form.get("email")),
          String(form.get("password")),
        );
    });
    if (ok) {
      if (signup) {
        setSignup(false);
        window.alert(result);
      } else navigate("/app");
    }
  }
  return (
    <div className="auth-page">
      <Brand />
      <div className="auth-card">
        <span className="eyebrow">YOUR NEXT FIND STARTS HERE</span>
        <h1>{signup ? "Join the search." : "Welcome back."}</h1>
        <p>
          {signup
            ? "Create an account to submit and track your requests."
            : "Sign in to check on your requests and offers."}
        </p>
        <form onSubmit={submit}>
          {signup && (
            <Field label="Your name">
              <input name="name" autoComplete="name" required maxLength={100} />
            </Field>
          )}
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field
            label="Password"
            hint={signup ? "Use at least 8 characters." : undefined}
          >
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </Field>
          <button className="button full" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        <button
          className="text-link auth-toggle"
          onClick={() => setSignup(!signup)}
        >
          {signup
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>
      <Link to="/" className="text-link">
        ← Back to FindIt
      </Link>
    </div>
  );
}
function Workspace() {
  const { user, loading, repo, run } = useApp();
  const [menu, setMenu] = useState(false);
  if (loading) return <div className="loading">Opening your workspace…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <DemoBanner />
      <div className="workspace">
        <aside className={menu ? "sidebar open" : "sidebar"}>
          <Brand />
          <span className="nav-label">YOUR WORKSPACE</span>
          <NavLink end to="/app" onClick={() => setMenu(false)}>
            <LayoutDashboard size={18} />
            {user.role === "admin" ? "Request desk" : "My requests"}
          </NavLink>
          {user.role === "buyer" && (
            <NavLink to="/app/new" onClick={() => setMenu(false)}>
              <Plus size={18} />
              New request
            </NavLink>
          )}
          <Link to="/" onClick={() => setMenu(false)}>
            <Compass size={18} />
            Explore FindIt
          </Link>
          <div className="sidebar-tip">
            <Sparkles size={20} />
            <h4>
              {user.role === "admin"
                ? "Find the right fit."
                : "The details make it."}
            </h4>
            <p>
              {user.role === "admin"
                ? "Confirm interest before sourcing. Keep every offer clear and complete."
                : "A model, a size, a must-have. A little detail helps us find a better match."}
            </p>
          </div>
          <div className="account">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === "admin" ? "Admin workspace" : "Student account"}
              </small>
            </div>
            {!repo.demo && (
              <button
                aria-label="Sign out"
                onClick={() => run(() => repo.signOut())}
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </aside>
        <div className="workspace-main">
          <header className="workspace-top">
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <span>
              YOUR NEXT FIND IS OUT THERE <ArrowUpRight size={14} />
            </span>
            <span className="location-label">
              Addis Ababa <span className="live-dot" />
            </span>
          </header>
          <Outlet />
        </div>
      </div>
    </>
  );
}
function Dashboard() {
  const { user, data, refresh, run, busy } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const admin = user?.role === "admin";
  const requests = data.requests.filter(
    (r) =>
      `${r.title} ${r.category} ${r.location}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || r.status === filter),
  );
  const active = data.requests.filter(
    (r) => !["matched", "closed"].includes(r.status),
  ).length;
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {admin
              ? "A GOOD DEAL STARTS WITH A GOOD MATCH"
              : "LESS SEARCHING, MORE FINDING"}
          </span>
          <h1>
            {admin
              ? "The request desk"
              : `Hey ${user?.name.split(" ")[0]}, what’s next?`}
          </h1>
          <p>
            {admin
              ? "A little organization. A lot of possibilities."
              : "Your wishlist, with a little help from us."}
          </p>
        </div>
        {!admin && (
          <Link to="/app/new" className="button">
            <Plus size={18} />
            New request
          </Link>
        )}
      </div>
      <div className="stats">
        <div>
          <span>{admin ? "Total requests" : "Your requests"}</span>
          <strong>{data.requests.length.toString().padStart(2, "0")}</strong>
          <ClipboardList />
        </div>
        <div>
          <span>In the works</span>
          <strong>{active.toString().padStart(2, "0")}</strong>
          <Search />
        </div>
        <div>
          <span>Offers to review</span>
          <strong>
            {data.offers
              .filter(
                (o) =>
                  o.status === "pending" &&
                  Date.parse(o.expires_at) > Date.now(),
              )
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <Sparkles />
        </div>
        <div>
          <span>Completed finds</span>
          <strong>
            {data.deals
              .filter((d) => d.status === "completed")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <Check />
        </div>
      </div>
      <div className="list-heading">
        <h2>
          {admin ? "Incoming & ongoing" : "Your requests"}{" "}
          <span>{data.requests.length}</span>
        </h2>
        <button
          className="text-link"
          disabled={busy}
          onClick={() => run(refresh)}
        >
          Refresh
        </button>
      </div>
      <div className="list-controls">
        <div className="tabs">
          {[
            ["all", "All requests"],
            ["sourcing", "Sourcing"],
            ["offer_sent", "Offers"],
            ["matched", "Matched"],
          ].map(([value, label]) => (
            <button
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="Search requests"
            placeholder="Search requests…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {requests.length ? (
        <div className="request-grid">
          {requests.map((r) => (
            <Link
              to={`/app/requests/${r.id}`}
              className="request-card"
              key={r.id}
            >
              <div className="card-top">
                <span
                  className={`category-icon category-${categories.indexOf(r.category)}`}
                >
                  {r.category === "Electronics" ? (
                    <MessageCircle size={23} />
                  ) : r.category === "Study essentials" ? (
                    <ClipboardList size={23} />
                  ) : (
                    <Compass size={23} />
                  )}
                </span>
                <Badge status={r.status} />
              </div>
              <span className="card-category">{r.category}</span>
              <h3>{r.title}</h3>
              <p>{r.details}</p>
              <div className="card-budget">
                <span>Budget up to</span>
                <strong>{money(r.budget)}</strong>
              </div>
              <div className="card-footer">
                <span>
                  {dateLabel(r.created_at)} ·{" "}
                  {r.readiness === "ready"
                    ? "Ready to buy"
                    : r.readiness === "comparing"
                      ? "Comparing options"
                      : "Researching"}
                </span>
                <ChevronRight size={18} />
              </div>
            </Link>
          ))}
          {!admin && (
            <Link className="new-card" to="/app/new">
              <span>
                <Plus size={26} />
              </span>
              <h3>Something else on your mind?</h3>
              <p>Let’s put it on the list.</p>
              <strong>
                Make a request <ArrowUpRight size={16} />
              </strong>
            </Link>
          )}
        </div>
      ) : (
        <Empty title="Nothing here just yet">
          {query || filter !== "all"
            ? "Try a different search or filter."
            : "Your first request could be your next great find."}
        </Empty>
      )}
      <div className="workspace-note">
        <ShieldCheck size={17} />
        Your contact details stay private. Every purchase starts with your
        approval.
      </div>
    </main>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/app" element={<Workspace />}>
            <Route index element={<Dashboard />} />
            <Route path="new" element={<RequestForm />} />
            <Route path="requests/:id" element={<RequestDetail />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="setup">
                <h1>That page wandered off.</h1>
                <Link className="button" to="/">
                  Back to FindIt
                </Link>
              </div>
            }
          />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
