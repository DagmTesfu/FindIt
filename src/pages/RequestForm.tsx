import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../app-context";
import { Field, ImageField } from "../components/ui";
import { categories, requestSchema } from "../domain/models";

export function RequestForm() {
  const { repo, run, busy, user } = useApp();
  const navigate = useNavigate();
  const [image, setImage] = useState<File>();
  const [validation, setValidation] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem(`findit.draft.${user?.id}`) || "{}",
      );
    } catch {
      return {};
    }
  });
  function saveDraft(form: HTMLFormElement) {
    const next = Object.fromEntries(
      [...new FormData(form).entries()].filter(
        ([, value]) => typeof value === "string",
      ),
    ) as Record<string, string>;
    setDraft(next);
    sessionStorage.setItem(`findit.draft.${user?.id}`, JSON.stringify(next));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidation("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const result = requestSchema.safeParse(form);
    if (!result.success) {
      setValidation(
        result.error.issues.map((issue) => issue.message).join(" "),
      );
      return;
    }
    let requestId = "";
    const ok = await run(async () => {
      requestId = await repo.createRequest(result.data, image);
    }, "Request submitted. We’ll review the details.");
    if (ok) {
      sessionStorage.removeItem(`findit.draft.${user?.id}`);
      navigate(`/app/requests/${requestId}`);
    }
  }
  return (
    <main className="page">
      <Link to="/app" className="back-link">
        <ArrowLeft size={16} />
        Back to requests
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LET’S START THE SEARCH</span>
          <h1>What’s on your wishlist?</h1>
          <p>Be specific. The better the details, the better the find.</p>
        </div>
      </div>
      <div className="form-layout">
        <form
          className="panel request-form"
          onSubmit={submit}
          onChange={(event) => saveDraft(event.currentTarget)}
        >
          <div className="form-section">
            <span className="section-number">01</span>
            <div>
              <h2>The item</h2>
              <p>Tell us exactly what you’re looking for.</p>
            </div>
          </div>
          <Field label="What do you want to buy?">
            <input
              name="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g. An original Casio fx-991EX calculator"
              defaultValue={draft.title}
            />
          </Field>
          <div className="form-row">
            <Field label="Category">
              <select
                name="category"
                defaultValue={draft.category || categories[0]}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Condition">
              <select
                name="condition"
                defaultValue={draft.condition || "either"}
              >
                <option value="either">New or used is fine</option>
                <option value="new">New only</option>
                <option value="used">Used preferred</option>
              </select>
            </Field>
          </div>
          <Field
            label="The details that matter"
            hint="Model, size, color, must-have features, and alternatives you’d accept."
          >
            <textarea
              name="details"
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              placeholder="Help us recognize the right one when we find it…"
              defaultValue={draft.details}
            />
          </Field>
          <ImageField onChange={setImage} />
          <Field label="What has made it difficult to find?">
            <textarea
              name="difficulty"
              required
              minLength={5}
              maxLength={1000}
              rows={2}
              placeholder="Where have you looked? Is it availability, price, or quality?"
              defaultValue={draft.difficulty}
            />
          </Field>
          <div className="form-section">
            <span className="section-number">02</span>
            <div>
              <h2>Your budget & timing</h2>
              <p>A few boundaries help us narrow the search.</p>
            </div>
          </div>
          <div className="form-row">
            <Field
              label="Maximum budget (birr)"
              hint="The most you’d pay in total, including delivery."
            >
              <input
                name="budget"
                type="number"
                step="0.01"
                min="1"
                max="10000000"
                required
                placeholder="e.g. 2500"
                defaultValue={draft.budget}
              />
            </Field>
            <Field
              label="When do you need it?"
              hint="Leave empty if your timing is flexible."
            >
              <input
                name="needed_by"
                type="date"
                min={new Date().toLocaleDateString("en-CA")}
                defaultValue={draft.needed_by}
              />
            </Field>
          </div>
          <Field label="How ready are you to buy?">
            <select name="readiness" defaultValue={draft.readiness || "ready"}>
              <option value="ready">
                Ready, if the item and price are right
              </option>
              <option value="comparing">
                Comparing options — might buy soon
              </option>
              <option value="researching">Just researching for now</option>
            </select>
          </Field>
          <div className="form-section">
            <span className="section-number">03</span>
            <div>
              <h2>Where to find you</h2>
              <p>These details are only shared with the FindIt team.</p>
            </div>
          </div>
          <Field label="Campus or general area">
            <input
              name="location"
              required
              maxLength={120}
              placeholder="e.g. AAU, 5 Kilo campus"
              defaultValue={draft.location}
            />
          </Field>
          <Field
            label="Telegram username or phone"
            hint="We may contact you here about this request."
          >
            <input
              name="contact"
              required
              minLength={3}
              maxLength={120}
              placeholder="@username or your phone number"
              defaultValue={draft.contact}
            />
          </Field>
          {validation && (
            <div className="inline-error" role="alert">
              {validation}
            </div>
          )}
          <div className="form-submit">
            <p>
              <ShieldCheck size={17} />A request isn’t a commitment to buy.
            </p>
            <button className="button" disabled={busy}>
              {busy ? "Submitting…" : "Submit request"}
              <ArrowRight size={17} />
            </button>
          </div>
        </form>
        <aside className="form-aside">
          <div className="tip-card">
            <Lightbulb size={25} />
            <h3>
              Good details.
              <br />
              Better matches.
            </h3>
            <p>
              “Headphones” is a start. “Wireless headphones under 3,000 birr
              with a microphone” gives us something to work with.
            </p>
          </div>
          <div className="expectations">
            <h3>What happens next?</h3>
            <p>
              <Check size={16} />
              We review your request.
            </p>
            <p>
              <Check size={16} />
              We may confirm details with you.
            </p>
            <p>
              <Check size={16} />
              If we find a match, you get an offer.
            </p>
            <small>
              We can’t guarantee availability or a match within your budget. You
              always choose whether to buy.
            </small>
          </div>
        </aside>
      </div>
    </main>
  );
}
