import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import { useApp } from "../app-context";
import { Badge, Empty } from "../components/ui";
import { dateLabel, money } from "../domain/models";
import "./dashboard.css";

export function Dashboard() {
  const { user, data, refresh, run, busy } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const admin = user?.role === "admin";
  // Highlight only actionable offers belonging to requests still awaiting an offer response.
  const pending = data.offers.filter(
    (o) =>
      o.status === "pending" &&
      Date.parse(o.expires_at) > Date.now() &&
      data.requests.some(
        (r) => r.id === o.request_id && r.status === "offer_sent",
      ),
  );
  const requests = data.requests.filter(
    (r) =>
      `${r.title} ${r.category} ${r.location}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || r.status === filter),
  );
  const confirmations = data.requests.filter(
    (r) => r.status === "awaiting_confirmation",
  ).length;
  const active = data.requests.filter(
    (r) => !["matched", "closed"].includes(r.status),
  ).length;
  const completed = data.deals.filter((d) => d.status === "completed").length;
  return (
    <main className="page buying-workspace">
      <div className="page-heading">
        <div>
          <h1>
            {admin ? "The request desk." : `Hey ${user?.name.split(" ")[0]}.`}
          </h1>
          <p>
            {admin
              ? `${active} open ${active === 1 ? "request" : "requests"}. ${confirmations} waiting for buyer confirmation.`
              : pending.length
                ? `${pending.length} ${pending.length === 1 ? "offer is" : "offers are"} ready for your review.`
                : data.requests.length
                  ? "Here’s where things stand with your list."
                  : "What have you been looking for?"}
          </p>
        </div>
        {!admin && (
          <Link to="/app/new" className="button">
            <Plus size={17} />
            Request an item
          </Link>
        )}
      </div>
      <div className="buying-layout">
        <div className="buying-content">
          {!admin && pending.length > 0 && (
            <section
              className="ready-offers"
              aria-label="Offers awaiting your review"
            >
              {pending.map((offer) => (
                <article className="desk-offer" key={offer.id}>
                  <span className="eyebrow">Offer ready for your review</span>
                  <h2>{offer.item}</h2>
                  <p className="offer-description">{offer.details}</p>
                  <p>{offer.fulfillment}</p>
                  <strong className="desk-price">{money(offer.total)}</strong>
                  <small>Total, including all fees and delivery.</small>
                  <div className="desk-offer-footer">
                    <Link
                      to={`/app/requests/${offer.request_id}`}
                      className="text-link"
                    >
                      Take a closer look <ArrowUpRight size={16} />
                    </Link>
                    <span>
                      Valid until {new Date(offer.expires_at).toLocaleString()}
                    </span>
                  </div>
                </article>
              ))}
            </section>
          )}
          {admin && (
            <div className="desk-totals">
              <span>
                <strong>{data.requests.length}</strong> total requests
              </span>
              <span>
                <strong>{pending.length}</strong> pending offers
              </span>
              <span>
                <strong>{completed}</strong> completed deals
              </span>
            </div>
          )}
          <div className="list-heading">
            <h2>
              {admin ? "Requests" : "Your list"}{" "}
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
                ["all", "All"],
                ["submitted", "New"],
                ["awaiting_confirmation", "Reply needed"],
                ["sourcing", "Searching"],
                ["offer_sent", "Offers"],
                ["matched", "Matched"],
                ["closed", "Closed"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={value === filter ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="Search requests"
                placeholder="Search your list…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {requests.length ? (
            <div className="desk-request-list">
              {requests.map((request) => {
                const deal = data.deals.find(
                  (d) => d.request_id === request.id,
                );
                return (
                  <Link
                    className="desk-request-row"
                    key={request.id}
                    to={`/app/requests/${request.id}`}
                  >
                    <div>
                      <h3>{request.title}</h3>
                      <p>
                        {request.category} · {dateLabel(request.created_at)}
                        {admin ? ` · ${request.location}` : ""}
                      </p>
                    </div>
                    <div className="desk-row-state">
                      {deal?.status === "completed" ? (
                        <span className="badge matched">Completed</span>
                      ) : deal?.status === "cancelled" ? (
                        <span className="badge closed">Deal cancelled</span>
                      ) : (
                        <Badge status={request.status} />
                      )}
                      <small>
                        {request.status === "awaiting_confirmation"
                          ? "Still interested? Open to reply."
                          : request.status === "sourcing"
                            ? "Looking for a suitable option."
                            : request.readiness === "ready"
                              ? "Ready to buy"
                              : request.readiness === "comparing"
                                ? "Comparing options"
                                : "Researching"}
                      </small>
                    </div>
                    <div className="desk-row-budget">
                      <small>Budget up to</small>
                      <strong>{money(request.budget)}</strong>
                    </div>
                    <ArrowUpRight size={17} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty
              title={
                query || filter !== "all"
                  ? "No matching requests"
                  : "Start with one thing."
              }
            >
              {query || filter !== "all" ? (
                "Try another search or filter."
              ) : (
                <>
                  <span>Tell us the item, the details, and your budget.</span>
                  {!admin && (
                    <Link className="text-link" to="/app/new">
                      Make your first request <ArrowUpRight size={16} />
                    </Link>
                  )}
                </>
              )}
            </Empty>
          )}
        </div>
        <aside className="buying-aside">
          <section>
            <h2>
              {admin ? "Before you go looking" : "A note about your offers"}
            </h2>
            <p>
              {admin
                ? "Check the buyer’s requirements and confirm they’re still interested. Keep supplier details and costs in private sourcing notes."
                : "Check the model, total price, and pickup details before accepting. If something isn’t right, ask us in the request’s conversation."}
            </p>
            <p className="pencil-note">
              {admin
                ? "A good match starts with listening."
                : "A good find should feel right."}
            </p>
          </section>
          <section>
            <h2>
              {admin ? "Keep the buyer in the loop." : "You’re in control."}
            </h2>
            <p>
              {admin
                ? "Send a clear offer and record payment only after checking receipt. Complete the deal once the buyer receives the item."
                : "We move ahead when you accept an offer. You can decline without buying. Your contact details stay private."}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
