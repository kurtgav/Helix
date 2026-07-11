import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LandingInteractions } from "./LandingInteractions";

// The Helix marketing landing — server-rendered. The hero thesis is the real
// product moment: a live Eligibility & Pre-Auth "proposed action" card.
export function Landing() {
  return (
    <div className="mk">
      {/* NAV */}
      <header className="mk-nav" id="mk-nav">
        <div className="wrap mk-nav__in">
          <Link href="/" className="brand" aria-label="Helix home">
            <span className="brand__mark" aria-hidden="true">
              <Icon name="helix" />
            </span>
            Helix
          </Link>
          <nav className="mk-nav__links" aria-label="Primary">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#agents">Agents</a>
            <a href="#security">Security</a>
          </nav>
          <span className="spacer" />
          <div className="mk-nav__cta">
            <Link href="/dashboard" className="link-quiet navlink-muted">
              Dashboard
            </Link>
            <Link href="/verify" className="btn btn--primary">
              Open the app
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="mk-hero" id="product">
          <div className="mk-hero__bg" aria-hidden="true" />
          <div className="wrap mk-hero__grid">
            <div className="mk-hero__copy">
              <span className="pill reveal">
                <span className="pill__tag">Helix</span>
                The AI operating layer for healthcare operations
              </span>
              <h1 className="mk-hero__title reveal d1">
                An autonomous teammate for every healthcare workflow.
              </h1>
              <p className="mk-hero__sub reveal d2">
                Helix runs on top of the systems your clinic already uses —{" "}
                <strong>
                  verifying insurance eligibility, clearing pre-authorizations, and
                  catching denials before they cost you.
                </strong>{" "}
                Your staff approves every action; Helix does the work. Purpose-built
                for PhilHealth and Philippine HMOs.
              </p>
              <div className="mk-hero__actions reveal d3">
                <Link href="/verify" className="btn btn--primary btn--lg">
                  Open the app
                  <Icon name="arrow" size={17} />
                </Link>
                <a href="#how" className="btn btn--lg">
                  See how it works
                </a>
              </div>
              <div className="mk-hero__trust reveal d4">
                <span>
                  <span className="dot-good" /> For diagnostic centers, laboratories &amp;
                  clinics
                </span>
                <span>
                  <span className="dot-good" /> PH Data Privacy Act-compliant by design
                </span>
              </div>
            </div>

            {/* Hero thesis: the real product moment */}
            <div className="mk-card-stage reveal d2">
              <div className="mk-card-echo" aria-hidden="true" />
              <article
                className="mk-card"
                aria-label="Helix eligibility and pre-authorization result"
              >
                <div className="mk-card__head">
                  <Icon name="shield" />
                  <span className="mk-card__label">Eligibility · Pre-Auth</span>
                  <span className="mk-live">
                    <span className="mk-live__dot" /> Live
                  </span>
                </div>
                <div className="mk-card__body">
                  <div className="mk-subject">
                    <span className="mk-subject__name">Juan D. · 34</span>
                    <span className="mk-subject__id">PT-4821</span>
                  </div>
                  <div className="mk-chips">
                    <span className="mk-chip">Maxicare · Prima</span>
                    <span className="mk-chip mk-chip--service">MRI — Brain</span>
                    <span className="mk-chip">Walk-in</span>
                  </div>
                  <span className="mk-verdict">
                    <Icon name="shield" /> Authorization required
                  </span>

                  <div className="mk-checks">
                    <div className="mk-check mk-check--ok">
                      <span className="mk-check__ic">
                        <Icon name="check" />
                      </span>
                      <span>
                        <span className="mk-check__t">Coverage active</span>
                        <span className="mk-check__d">
                          Maxicare Prima · valid to <span className="mono">12/2026</span>
                        </span>
                      </span>
                      <span className="mk-check__flag">Verified</span>
                    </div>
                    <div className="mk-check mk-check--ok">
                      <span className="mk-check__ic">
                        <Icon name="doc" />
                      </span>
                      <span>
                        <span className="mk-check__t">Pre-authorization drafted</span>
                        <span className="mk-check__d">
                          Letter of Authorization ready for review
                        </span>
                      </span>
                      <span className="mk-check__flag">Drafted</span>
                    </div>
                    <div className="mk-check mk-check--bad">
                      <span className="mk-check__ic">
                        <Icon name="alert" />
                      </span>
                      <span>
                        <span className="mk-check__t">Referral missing</span>
                        <span className="mk-check__d">
                          Required for imaging · request sent to referring physician
                        </span>
                      </span>
                      <span className="mk-check__flag">Blocking</span>
                    </div>
                  </div>
                </div>
                <div className="mk-card__foot">
                  <span className="mk-card__attrib">
                    <b>Helix</b> proposed this.
                    <br />
                    You approve.
                  </span>
                  <span className="spacer" />
                  <Link href="/verify" className="btn btn--ghost">
                    Edit
                  </Link>
                  <Link href="/verify" className="btn btn--primary">
                    Approve
                  </Link>
                </div>
              </article>
              <div className="mk-card__meta" aria-hidden="true">
                <span>
                  <Icon name="pulse" size={13} /> verified in 2.3s
                </span>
                <span>
                  <Icon name="fingerprint" size={13} /> audit #A2F9C
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* PAYER STRIP */}
        <div className="mk-payers">
          <div className="wrap mk-payers__in">
            <span className="mk-payers__cap">Designed for</span>
            <div className="mk-payers__list">
              <b>PhilHealth</b>
              <b>Maxicare</b>
              <b>Intellicare</b>
              <b>Medicard</b>
              <b>PhilCare</b>
              <b>ValuCare</b>
            </div>
          </div>
        </div>

        {/* METRICS */}
        <section className="mk-section" style={{ paddingBottom: 0 }}>
          <div className="wrap">
            <div className="mk-metrics reveal">
              <div className="mk-metric">
                <span className="mk-metric__k">One action</span>
                <div className="mk-metric__n">
                  1<span className="u">click</span>
                </div>
                <p className="mk-metric__l">
                  Eligibility and pre-authorization in a single step — layered on the
                  systems you already run.
                </p>
              </div>
              <div className="mk-metric">
                <span className="mk-metric__k">Accountable</span>
                <div className="mk-metric__n">
                  100<span className="u">%</span>
                </div>
                <p className="mk-metric__l">
                  Every action Helix takes is cited, logged, attributed, and reversible.
                </p>
              </div>
              <div className="mk-metric">
                <span className="mk-metric__k">Off your desk</span>
                <div className="mk-metric__n">
                  0<span className="u">logins</span>
                </div>
                <p className="mk-metric__l">
                  No payer portals for your front desk. Helix speaks to the payers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mk-section" id="how">
          <div className="wrap">
            <div className="mk-head reveal">
              <span className="eyebrow">How it works</span>
              <h2>Integrate, don&apos;t replace. Then let the work run itself.</h2>
              <p>
                Helix is an operating layer, not another system to migrate to. It starts
                producing value on day one.
              </p>
            </div>
            <div className="mk-steps">
              <div className="mk-step reveal">
                <span className="mk-step__n">01 — Connect</span>
                <h3>Sits on what you have</h3>
                <p>
                  Helix layers on top of your HIS, billing software, or spreadsheets. No
                  migration, no rip-and-replace.
                </p>
              </div>
              <div className="mk-step reveal d1">
                <span className="mk-step__n">02 — Verify &amp; draft</span>
                <h3>Does the work at intake</h3>
                <p>
                  It checks coverage, flags what&apos;s missing, and drafts the
                  authorization — every claim sourced and cited, never guessed.
                </p>
              </div>
              <div className="mk-step reveal d2">
                <span className="mk-step__n">03 — Approve &amp; audit</span>
                <h3>You stay in control</h3>
                <p>
                  Your staff approves in one tap. Every decision writes to an immutable,
                  reversible audit trail.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AGENTS */}
        <section className="mk-section" id="agents" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="mk-head reveal">
              <span className="eyebrow">The workforce</span>
              <h2>One agent per repetitive workflow. A department that never sleeps.</h2>
              <p>
                Start with eligibility and pre-authorization. Add teammates as you grow —
                each one shares the same approval, audit, and security foundation.
              </p>
            </div>
            <div className="mk-agents">
              {AGENTS.map((a, i) => (
                <div className={`mk-agent reveal${i % 3 ? ` d${i % 3}` : ""}`} key={a.name}>
                  <div className="mk-agent__top">
                    <span className="mk-agent__ic">
                      <Icon name={a.icon} />
                    </span>
                    <span
                      className={`mk-agent__status${a.live ? " mk-agent__status--live" : ""}`}
                    >
                      {a.live ? "Available" : "Roadmap"}
                    </span>
                  </div>
                  <h3>{a.name}</h3>
                  <p>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section className="mk-section" id="security" style={{ paddingTop: 0 }}>
          <div className="wrap mk-secure">
            <div className="mk-head reveal" style={{ marginBottom: 0 }}>
              <span className="eyebrow">Trust</span>
              <h2>Built for the most regulated work there is.</h2>
              <p>
                Autonomy without oversight is a liability. Helix is engineered so a human
                is always in the loop and every action can be traced.
              </p>
            </div>
            <div className="mk-secure__list reveal d1">
              {SECURITY.map((s) => (
                <div className="mk-secure__item" key={s.title}>
                  <Icon name={s.icon} />
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mk-section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="mk-head reveal">
              <span className="eyebrow">Questions</span>
              <h2>What clinics ask first.</h2>
            </div>
            <div className="mk-faq reveal d1">
              {FAQ.map((f) => (
                <div className="mk-faq__item" key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mk-section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="mk-cta reveal">
              <div className="mk-cta__in">
                <h2>See Helix on your own workflows.</h2>
                <p>
                  Open the live app and run a verification end to end — eligibility, LOA
                  draft, and a one-tap approval. No sign-up, no migration to start.
                </p>
                <div className="mk-cta__actions">
                  <Link href="/verify" className="btn btn--primary btn--lg">
                    Open the app
                    <Icon name="arrow" size={17} />
                  </Link>
                  <Link href="/dashboard" className="btn btn--lg">
                    View the dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mk-foot">
        <div className="wrap mk-foot__grid">
          <div className="mk-foot__brand">
            <Link href="/" className="brand" aria-label="Helix home">
              <span className="brand__mark" aria-hidden="true">
                <Icon name="helix" />
              </span>
              Helix
            </Link>
            <p>
              The AI operating layer for healthcare operations. Remove administrative
              friction with autonomous systems — while humans keep final control.
            </p>
          </div>
          <div className="mk-foot__col">
            <h4>Product</h4>
            <a href="#product">Overview</a>
            <a href="#agents">Agents</a>
            <Link href="/verify">Verify a walk-in</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
          <div className="mk-foot__col">
            <h4>Company</h4>
            <a href="#security">Security</a>
            <a href="#how">How it works</a>
            <a href="#top">Back to top</a>
          </div>
          <div className="mk-foot__col">
            <h4>Legal</h4>
            <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
              Privacy · Data processing · Terms
            </span>
          </div>
        </div>
        <div className="wrap mk-foot__base">
          <p>© 2026 Helix. Manila, Philippines.</p>
          <p className="mono">Interface shown with synthetic data.</p>
        </div>
      </footer>

      <LandingInteractions />
    </div>
  );
}

const AGENTS = [
  {
    name: "Eligibility & Pre-Auth",
    desc: "Verifies coverage and clears authorizations before service is rendered.",
    icon: "shield",
    live: true,
  },
  {
    name: "Revenue Cycle",
    desc: "Monitors denials, reimbursements, and revenue leakage — and proposes the fix.",
    icon: "pulse",
    live: false,
  },
  {
    name: "Documentation",
    desc: "Reads referrals, IDs, and physician notes into clean, structured data.",
    icon: "doc",
    live: false,
  },
  {
    name: "Coding",
    desc: "Suggests ICD and case-rate codes, then validates the claim before it goes out.",
    icon: "hash",
    live: false,
  },
  {
    name: "Compliance",
    desc: "Answers instantly from your SOPs, accreditation manuals, and internal policy.",
    icon: "clipboard",
    live: false,
  },
  {
    name: "Executive",
    desc: "A daily brief on risk, bottlenecks, and revenue — recommendations, not a dashboard.",
    icon: "chart",
    live: false,
  },
] as const;

const SECURITY = [
  {
    title: "Human approval",
    desc: "Agents propose; your team decides. Nothing reaches a payer or patient unapproved.",
    icon: "users",
  },
  {
    title: "Immutable audit",
    desc: "Every action attributed and time-stamped, with its sources. Reversible by design.",
    icon: "fingerprint",
  },
  {
    title: "Least privilege",
    desc: "Role-based access, isolation per organization, encryption in transit and at rest.",
    icon: "lock",
  },
  {
    title: "Privacy by design",
    desc: "Architected for RA 10173 (PH Data Privacy Act) and HIPAA-grade controls.",
    icon: "shield",
  },
] as const;

const FAQ = [
  {
    q: "Do we have to replace our current system?",
    a: "No. Helix is an operating layer — it sits on top of your HIS, billing app, or spreadsheets and never becomes the system of record. Where an integration exists we use it; where it doesn't, Helix still works from the coverage and service details your front desk already collects.",
  },
  {
    q: "Does the AI decide anything on its own?",
    a: "Never for anything that leaves the building. Every determination is a proposal your staff approves, edits, or rejects — and everything is logged. Helix handles administrative reasoning only; it makes no clinical judgments.",
  },
  {
    q: "How does it avoid making up payer rules?",
    a: "Helix retrieves the payer's requirements first and reasons only over what it retrieved, citing the source for every claim. When the information is insufficient it returns needs-review rather than guessing.",
  },
  {
    q: "Is our patient data safe?",
    a: "Data is treated as sensitive personal information under the PH Data Privacy Act. Least-privilege access, encryption, an immutable audit trail, and strict data minimization to any third-party model are built in from the start.",
  },
] as const;
