import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock3,
  LockKeyhole,
  MessageCircle,
  Send,
} from "lucide-react";
import { useApp } from "../app-context";
import { Badge, Field, ImageField } from "../components/ui";
import { DealPanel } from "../components/DealPanel";
import { canAccept, dateLabel, money, offerSchema } from "../domain/models";

export function RequestDetail() {
  const { id } = useParams();
  const { data, user, repo, run, busy } = useApp();
  const [image, setImage] = useState<File>();
  const [showOffer, setShowOffer] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [message, setMessage] = useState("");
  const request = data.requests.find((r) => r.id === id);
  const admin = user?.role === "admin";
  if (!request)
    return (
      <main className="page">
        <h1>Request unavailable</h1>
        <p>It may not exist, or you may not have access.</p>
        <Link to="/app" className="button">
          Back to requests
        </Link>
      </main>
    );
  const requestId = request.id;
  const offers = data.offers.filter((o) => o.request_id === id);
  const deal = data.deals.find((d) => d.request_id === id);
  const messages = data.messages
    .filter((m) => m.request_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const open = !["closed", "matched"].includes(request.status);
  async function makeOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.expires_at)
      values.expires_at = new Date(String(values.expires_at)).toISOString();
    const parsed = offerSchema.safeParse(values);
    if (!parsed.success) {
      setOfferError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    setOfferError("");
    if (
      await run(
        () => repo.createOffer(requestId, parsed.data, image),
        "Offer sent. The buyer can now review it.",
      )
    ) {
      setShowOffer(false);
      setImage(undefined);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (await run(() => repo.sendMessage(requestId, message))) setMessage("");
  }
  function closeRequest() {
    const reason = window.prompt("Why are you closing this request?");
    if (reason?.trim())
      run(
        () => repo.setRequestStatus(requestId, "closed", reason),
        "Request closed.",
      );
  }
  return (
    <main className="page">
      <Link className="back-link" to="/app">
        <ArrowLeft size={16} />
        Back to requests
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {request.category} · {dateLabel(request.created_at)}
          </span>
          <h1>{request.title}</h1>
          <p>Request #{request.id.slice(0, 8)}</p>
        </div>
        <Badge status={request.status} />
      </div>
      {request.status === "awaiting_confirmation" && (
        <div className="action-banner">
          <div>
            <strong>
              {admin
                ? "Waiting for the buyer to confirm."
                : "Still looking for this?"}
            </strong>
            <p>
              {admin
                ? "A recent confirmation helps you prioritize your search."
                : "Confirm your interest so we know it’s a good time to start looking."}
            </p>
          </div>
          {!admin && (
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                run(
                  () => repo.confirmInterest(requestId),
                  "Interest confirmed. We’ll start looking.",
                )
              }
            >
              <Check size={16} />
              Yes, still interested
            </button>
          )}
        </div>
      )}
      <div className="detail-layout">
        <div className="detail-main">
          <section className="panel">
            <h2>The wishlist</h2>
            <p className="preserve">{request.details}</p>
            {request.image_url && (
              <a href={request.image_url} target="_blank" rel="noreferrer">
                <img
                  className="reference-image"
                  src={request.image_url}
                  alt="Buyer’s reference item"
                />
              </a>
            )}
            <div className="detail-facts">
              <div>
                <span>Budget up to</span>
                <strong>{money(request.budget)}</strong>
              </div>
              <div>
                <span>Condition</span>
                <strong>
                  {request.condition === "either"
                    ? "New or used"
                    : request.condition}
                </strong>
              </div>
              <div>
                <span>Needed by</span>
                <strong>
                  {request.needed_by
                    ? dateLabel(request.needed_by)
                    : "Flexible"}
                </strong>
              </div>
              <div>
                <span>Buying readiness</span>
                <strong>
                  {request.readiness === "ready"
                    ? "Ready to buy"
                    : request.readiness === "comparing"
                      ? "Comparing options"
                      : "Researching"}
                </strong>
              </div>
            </div>
            <div className="detail-note">
              <span>THE DIFFICULT PART</span>
              <p>{request.difficulty}</p>
            </div>
            {request.close_reason && (
              <div className="detail-note">
                <span>CLOSED BECAUSE</span>
                <p>{request.close_reason}</p>
              </div>
            )}
          </section>
          {offers.map((offer) => (
            <section className="panel offer-panel" key={offer.id}>
              <div className="section-inline">
                <span className="eyebrow">
                  {offer.status === "accepted"
                    ? "YOUR AGREED OFFER"
                    : "AN OPTION FOR YOU"}
                </span>
                <span className="pill">
                  {offer.status === "pending" &&
                  Date.parse(offer.expires_at) <= Date.now()
                    ? "Expired"
                    : offer.status}
                </span>
              </div>
              <h2>{offer.item}</h2>
              <p className="preserve">{offer.details}</p>
              {offer.image_url && (
                <img
                  className="reference-image"
                  src={offer.image_url}
                  alt={offer.item}
                />
              )}
              <div className="offer-price">
                <span>Total, including all fees & delivery</span>
                <strong>{money(offer.total)}</strong>
              </div>
              <div className="detail-note">
                <span>DELIVERY / PICKUP</span>
                <p>{offer.fulfillment}</p>
              </div>
              <div className="detail-note">
                <span>RETURN & CANCELLATION TERMS</span>
                <p className="preserve">{offer.terms}</p>
              </div>
              <p className="muted">
                <Clock3 size={15} />
                Valid until {new Date(offer.expires_at).toLocaleString()}
              </p>
              {!admin && canAccept(offer, request) && (
                <div className="button-row">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Accept this item for ${money(offer.total)} under the displayed terms? Payment will be arranged separately.`,
                        )
                      )
                        run(
                          () => repo.respondOffer(offer.id, true),
                          "Offer accepted. Next: arrange payment and delivery.",
                        );
                    }}
                  >
                    Accept offer <Check size={16} />
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => repo.respondOffer(offer.id, false),
                        "Offer declined. Tell us what you’d prefer in the conversation.",
                      )
                    }
                  >
                    Decline
                  </button>
                </div>
              )}
            </section>
          ))}
          {deal && (
            <DealPanel
              key={`${deal.id}-${deal.status}-${deal.payment}-${deal.note}`}
              deal={deal}
              admin={admin}
            />
          )}
          {admin && showOffer && (
            <form className="panel" onSubmit={makeOffer}>
              <h2>Create an offer</h2>
              <p className="muted">
                A new offer replaces any pending offer. Accepted terms stay
                unchanged.
              </p>
              <Field label="Actual item">
                <input name="item" required minLength={3} maxLength={120} />
              </Field>
              <Field label="Specifications and condition">
                <textarea
                  name="details"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={3}
                />
              </Field>
              <ImageField onChange={setImage} />
              <div className="form-row">
                <Field label="Total price (birr), all costs included">
                  <input
                    name="total"
                    type="number"
                    min="1"
                    max="10000000"
                    step="0.01"
                    required
                  />
                </Field>
                <Field label="Offer expires">
                  <input name="expires_at" type="datetime-local" required />
                </Field>
              </div>
              <Field label="Delivery / pickup and estimated timing">
                <textarea
                  name="fulfillment"
                  required
                  minLength={5}
                  maxLength={1000}
                />
              </Field>
              <Field label="Return and cancellation terms">
                <textarea
                  name="terms"
                  required
                  minLength={5}
                  maxLength={2000}
                />
              </Field>
              {offerError && (
                <div role="alert" className="inline-error">
                  {offerError}
                </div>
              )}
              <div className="button-row">
                <button className="button" disabled={busy}>
                  Send offer <ArrowUpRight size={16} />
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowOffer(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <section className="panel conversation">
            <h2>
              <MessageCircle size={20} />
              The conversation <span className="count">{messages.length}</span>
            </h2>
            <p className="muted">
              Questions, updates, and the little details. This thread is
              private.
            </p>
            <div className="messages">
              {messages.length ? (
                messages.map((m) => (
                  <div
                    className={`message ${m.sender_id === user?.id ? "own" : ""}`}
                    key={m.id}
                  >
                    <span>
                      {m.sender_id === user?.id
                        ? "You"
                        : m.sender_id === request.buyer_id
                          ? "Buyer"
                          : "FindIt team"}{" "}
                      · {new Date(m.created_at).toLocaleString()}
                    </span>
                    <p>{m.body}</p>
                  </div>
                ))
              ) : (
                <p className="conversation-empty">
                  No messages yet. Start with a question or an update.
                </p>
              )}
            </div>
            <form className="message-compose" onSubmit={send}>
              <textarea
                aria-label="Message"
                placeholder="Write a message…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={3000}
                rows={2}
              />
              <button
                className="button"
                aria-label="Send message"
                disabled={busy || !message.trim()}
              >
                <Send size={18} />
              </button>
            </form>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="panel">
            <h3>Request details</h3>
            <dl>
              <dt>Location</dt>
              <dd>{request.location}</dd>
              <dt>Contact · private</dt>
              <dd>{request.contact}</dd>
              <dt>Interest last confirmed</dt>
              <dd>
                {request.confirmed_at
                  ? new Date(request.confirmed_at).toLocaleString()
                  : "Not confirmed yet"}
              </dd>
            </dl>
            <p className="small-note">
              Readiness is self-reported, not a promise to purchase.
            </p>
            {open && (
              <div className="stack-buttons">
                {admin && (
                  <>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => setShowOffer(true)}
                    >
                      Create offer <PlusIcon />
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            repo.setRequestStatus(
                              requestId,
                              "awaiting_confirmation",
                            ),
                          "Confirmation requested.",
                        )
                      }
                    >
                      Ask to confirm interest
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => repo.setRequestStatus(requestId, "sourcing"),
                          "Marked as sourcing.",
                        )
                      }
                    >
                      Mark as sourcing
                    </button>
                  </>
                )}
                <button
                  className="danger-link"
                  disabled={busy}
                  onClick={closeRequest}
                >
                  {admin ? "Close request" : "Cancel request"}
                </button>
              </div>
            )}
          </section>
          {admin && (
            <section className="panel private-notes">
              <h3>
                <LockKeyhole size={16} />
                Private sourcing notes
              </h3>
              <p className="small-note">
                Only admins can see supplier details and costs.
              </p>
              {data.notes
                .filter((n) => n.request_id === id)
                .map((n) => (
                  <div className="private-note" key={n.id}>
                    <p>{n.body}</p>
                    <small>Estimated cost: {money(n.cost)}</small>
                  </div>
                ))}
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const values = new FormData(form);
                  if (
                    await run(
                      () =>
                        repo.addNote(
                          requestId,
                          String(values.get("body")),
                          Number(values.get("cost")),
                        ),
                      "Private note saved.",
                    )
                  )
                    form.reset();
                }}
              >
                <Field label="Supplier / sourcing note">
                  <textarea name="body" required maxLength={3000} rows={3} />
                </Field>
                <Field label="Estimated total cost (birr)">
                  <input
                    name="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue="0"
                  />
                </Field>
                <button className="button secondary full" disabled={busy}>
                  Save private note
                </button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
function PlusIcon() {
  return <span aria-hidden="true">+</span>;
}
