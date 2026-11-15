import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../app-context";
import { Brand, DemoBanner } from "../App";
import "./landing.css";

export function Landing() {
  const { user } = useApp();
  return (
    <div className="welcome-page atelier-page">
      <DemoBanner />
      <header className="landing-nav">
        <Brand />
        <nav>
          <a href="#how-it-works">How it works</a>
          <Link to={user ? "/app" : "/login"} className="text-link">
            {user ? "My workspace" : "Sign in"} <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main className="welcome-main">
        <section className="welcome-hero">
          <div>
            <span className="eyebrow">For students in Addis Ababa</span>
            <h1>
              Can’t find it?
              <br />
              <em>We’ll look for you.</em>
            </h1>
            <p>
              Tell us what you want to buy and your budget in birr.
              <br />
              We find options and send you an offer. You decide.
            </p>
            <Link className="button" to="/app/new">
              Request an item <ArrowUpRight size={18} />
            </Link>
            <small>Free to request. No obligation to buy.</small>
          </div>
          <figure className="atelier-showcase">
            <div className="atelier-tickets">
              <div className="atelier-ticket">
                <span className="eyebrow">You ask / example</span>
                <h2>A Casio calculator.</h2>
                <p>
                  Original. New or used.
                  <br />
                  Pickup near 5 Kilo.
                </p>
                <div className="ticket-price">
                  <span>My budget</span>
                  <strong>2,500 birr</strong>
                </div>
              </div>
              <div className="atelier-ticket atelier-response">
                <span className="eyebrow">We find / example offer</span>
                <h2>A possible match.</h2>
                <p>
                  Casio fx-991EX · New
                  <br />
                  Review the item and pickup terms.
                </p>
                <div className="ticket-price">
                  <span>Total price</span>
                  <strong>2,200 birr</strong>
                </div>
              </div>
            </div>
            <figcaption>
              Illustrative item and prices. Availability isn’t guaranteed.
            </figcaption>
          </figure>
        </section>
        <section
          id="how-it-works"
          className="welcome-steps"
          aria-label="How FindIt works"
        >
          {[
            [
              "Ask for something specific.",
              "The item you want, your budget, and the details that matter.",
            ],
            [
              "Let us do the looking.",
              "We check options and contact you if something fits.",
            ],
            [
              "Buy only when it fits.",
              "You approve the actual item and total price.",
            ],
          ].map(([title, text], i) => (
            <article key={title}>
              <h2>
                <span>0{i + 1}</span> — {title}
              </h2>
              <p>{text}</p>
            </article>
          ))}
        </section>
        <section className="welcome-close">
          <p>Something specific? That’s a good place to start.</p>
          <Link to="/app/new" className="text-link">
            Make your first request <ArrowUpRight size={16} />
          </Link>
        </section>
      </main>
      <footer>
        <Brand />
        <span>Built around student life in Addis Ababa.</span>
        <span>Availability isn’t guaranteed. You approve every offer.</span>
      </footer>
    </div>
  );
}
