import { useState, type FormEvent } from "react";
import { useApp } from "../app-context";
import { Field } from "./ui";
import type { Deal } from "../domain/models";

const deliveryOptions: Record<Deal["status"], { label: string; help: string }> =
  {
    accepted: {
      label: "Offer accepted",
      help: "The buyer agreed to the offer. Payment and delivery still need arranging.",
    },
    arranging: {
      label: "Arranging payment & delivery",
      help: "Agree on how to pay and where to deliver or collect the item.",
    },
    ready: {
      label: "Ready for pickup / out for delivery",
      help: "The item is ready. Wait until the buyer receives it before completing the deal.",
    },
    completed: {
      label: "Buyer received the item",
      help: "Use this only after delivery or pickup is confirmed and payment has been received.",
    },
    cancelled: {
      label: "Deal cancelled",
      help: "Explain why the deal ended. Record any refund separately below.",
    },
  };
const paymentOptions: Record<Deal["payment"], { label: string; help: string }> =
  {
    unpaid: { label: "Not paid yet", help: "You have not received payment." },
    pending_verification: {
      label: "Buyer says they paid — check receipt",
      help: "Check your own bank or payment account. A screenshot alone does not confirm receipt.",
    },
    paid: {
      label: "Payment received & checked",
      help: "Select this after you personally verify the money arrived.",
    },
    refunded: {
      label: "Money returned to buyer",
      help: "Select this after you have actually sent the refund.",
    },
  };

export function DealPanel({ deal, admin }: { deal: Deal; admin: boolean }) {
  const { repo, run, busy } = useApp();
  const [status, setStatus] = useState(deal.status);
  const [payment, setPayment] = useState(deal.payment);
  const [note, setNote] = useState(deal.note);
  // Closed deal progress stays locked, matching the database rule. Payment can
  // still be corrected (for example, recording a refund after cancellation).
  const finished = ["completed", "cancelled"].includes(deal.status);
  const needsNote = ["completed", "cancelled"].includes(status);
  const invalidCompletion = status === "completed" && payment !== "paid";
  const changed =
    status !== deal.status || payment !== deal.payment || note !== deal.note;
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(
      () => repo.updateDeal(deal.id, status, payment, note.trim()),
      "Deal saved. The buyer can see your update.",
    );
  }
  return (
    <section className="panel deal-panel">
      <span className="eyebrow">
        {admin ? "MANAGE THIS DEAL" : "YOUR DEAL"}
      </span>
      <h2>
        {deal.status === "completed"
          ? "Deal completed"
          : deal.status === "cancelled"
            ? "Deal cancelled"
            : "Payment & delivery"}
      </h2>
      <div className="deal-summary">
        <div>
          <span>Delivery status</span>
          <strong>{deliveryOptions[deal.status].label}</strong>
        </div>
        <div>
          <span>Payment status</span>
          <strong>{paymentOptions[deal.payment].label}</strong>
        </div>
      </div>
      {deal.note && (
        <div className="detail-note">
          <span>LATEST UPDATE FROM FINDIT</span>
          <p className="preserve">{deal.note}</p>
        </div>
      )}
      {admin ? (
        <>
          <div className="deal-guide">
            <strong>You’re recording what happened.</strong>
            <p>
              Arrange payment with the buyer in the conversation. Check that the
              money arrived, then confirm when the buyer receives the item.
              Saving here updates the record; it does not charge or refund
              anyone.
            </p>
          </div>
          <form onSubmit={submit}>
            <Field
              label="1. Has the buyer paid?"
              hint={paymentOptions[payment].help}
            >
              <select
                name="payment"
                value={payment}
                onChange={(event) =>
                  setPayment(event.target.value as Deal["payment"])
                }
              >
                {Object.entries(paymentOptions).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="2. Where is the item now?"
              hint={
                finished
                  ? "This deal is closed. Its delivery status is locked."
                  : deliveryOptions[status].help
              }
            >
              <select
                name="status"
                value={status}
                disabled={finished}
                onChange={(event) =>
                  setStatus(event.target.value as Deal["status"])
                }
              >
                {Object.entries(deliveryOptions).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={`3. Write an update for the buyer${needsNote ? " (required)" : " (optional)"}`}
              hint={
                status === "cancelled"
                  ? "Explain the cancellation and any refund arrangements."
                  : "Example: Payment received. Your item is ready for pickup at 5 Kilo tomorrow at 2 PM."
              }
            >
              <textarea
                name="note"
                maxLength={2000}
                rows={3}
                required={needsNote}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tell the buyer what happened or what to do next…"
              />
            </Field>
            {invalidCompletion && (
              <p className="inline-error" role="alert">
                To complete this deal, first verify payment and select “Payment
                received & checked.”
              </p>
            )}
            <button
              className="button"
              disabled={
                busy ||
                !changed ||
                invalidCompletion ||
                (needsNote && !note.trim())
              }
            >
              {busy ? "Saving…" : "Save payment & delivery update"}
            </button>
            <p className="small-note">
              The buyer will see the saved statuses and your message. Contact
              them separately if they need an immediate alert.
            </p>
          </form>
        </>
      ) : (
        <p className="small-note">
          Arrange payment and pickup with FindIt in the conversation below. The
          FindIt team updates these statuses after checking payment and
          delivery.
        </p>
      )}
    </section>
  );
}
