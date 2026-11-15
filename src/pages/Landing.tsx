import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../app-context";
import { Brand, DemoBanner } from "../App";
import "./landing.css";

export function Landing() {
  const { user } = useApp();
  return (
    <div className="welcome-page">
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
            <span className="eyebrow">A buying desk for Addis students</span>
            <h1>
              That thing
              <br />
              you’ve been
              <br />
              <em>looking for.</em>
            </h1>
            <p>
              Tell us what it is and what you can spend.
              <br />
              We’ll look for it, check the details, and bring
              <br className="desktop-only" /> you an offer you can say yes—or
              no—to.
            </p>
            <Link className="button" to="/app/new">
              Tell us what you need <ArrowUpRight size={18} />
            </Link>
            <small>No payment to request. You decide before buying.</small>
          </div>
          <figure className="request-desk">
            <div className="paper-slip">
              <div className="slip-heading">
                <span>On the lookout</span>
                <span>No. 001</span>
              </div>
              <blockquote>
                “A calculator that’ll
                <br />
                get me through
                <br />
                engineering.”
              </blockquote>
              <p>
                Casio fx-991EX or similar.
                <br />
                Original. New or used is fine.
              </p>
              <div className="slip-tags">
                <span>Up to 2,500 birr</span>
                <span>5 Kilo</span>
              </div>
              <span className="request-stamp">Request received</span>
              <p className="pencil-note">The little details help us find it.</p>
            </div>
            <figcaption>An example request. What’s on your list?</figcaption>
          </figure>
        </section>
        <section
          id="how-it-works"
          className="welcome-steps"
          aria-label="How FindIt works"
        >
          {[
            [
              "Your list.",
              "The item, your budget, and the details that matter.",
            ],
            [
              "Our search.",
              "We check options and contact you if something fits.",
            ],
            ["Your decision.", "A clear total price. No pressure to say yes."],
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
