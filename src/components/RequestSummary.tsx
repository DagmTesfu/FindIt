import { money } from "../domain/models";

export function RequestSummary({ draft }: { draft: Record<string, string> }) {
  const hasItem = Boolean(draft.title?.trim());
  return (
    <aside
      className="form-aside compact-request-summary"
      aria-label="Request summary"
    >
      <section className="request-receipt">
        <span className="eyebrow">Your request</span>
        {hasItem ? (
          <>
            <h2>{draft.title.trim()}</h2>
            <dl>
              <div>
                <dt>Budget</dt>
                <dd>
                  {Number(draft.budget) > 0
                    ? `Up to ${money(Number(draft.budget))}`
                    : "Not added yet"}
                </dd>
              </div>
              <div>
                <dt>Area</dt>
                <dd>{draft.location?.trim() || "Not added yet"}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="summary-empty">Add an item to see your summary here.</p>
        )}
        <div className="summary-next">
          <h3>After you send it</h3>
          <p>
            We review your request and look for a match. If we find one, we send
            you an offer.
          </p>
          <strong>You decide whether to buy.</strong>
        </div>
        <small>Not sent until you click “Send my request.”</small>
      </section>
    </aside>
  );
}
