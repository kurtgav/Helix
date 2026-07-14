import Link from "next/link";
import { Icon } from "@/components/Icon";
import { LandingInteractions } from "./LandingInteractions";

// Signal glyph — references a sprite symbol by id (mirrors <Icon/> but not bound
// to its typed name union, so newly-added sprite symbols like peso/clock/spark
// can be used here without editing the shared Icon component).
function Sig({ id, size = 18 }: { id: string; size?: number }) {
  return (
    <svg
      className="ico"
      style={{ width: size, height: size }}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#i-${id}`} />
    </svg>
  );
}

// The Helix marketing landing — fully server-rendered and static. The hero
// thesis is the real product moment: a live "proposed action" card. Content is
// painted on the server and revealed with CSS-only motion (see marketing.css
// `mk-rise`); nothing here gates visibility on client JS.
export function Landing() {
  return (
    <div className="mk">
      <a href="#top" className="skip-link">
        Skip to main content
      </a>
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
            <a href="#roi">Proof</a>
            <a href="#agents">Workforce</a>
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
                Helix is an operating layer over the systems your clinic already runs —{" "}
                <strong>
                  a growing workforce of agents that verify eligibility, clear
                  pre-authorizations, and recover denied revenue.
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

              {/* Workforce status — two agents live today */}
              <div className="mk-hero__force reveal d4">
                <span className="mk-hero__force-cap">
                  <span className="mk-live__dot" /> Live now
                </span>
                <span className="mk-force-chip">
                  <Icon name="shield" size={14} /> Eligibility &amp; Pre-Auth
                </span>
                <span className="mk-force-chip">
                  <Icon name="pulse" size={14} /> Revenue Cycle
                </span>
                <span className="mk-hero__force-more">+4 in the workforce</span>
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
                  <Icon name="pulse" size={13} /> verified in 1.8s
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

        {/* ROI PROOF */}
        <section className="mk-section" id="roi">
          <div className="wrap">
            <div className="mk-head reveal">
              <span className="eyebrow">Proof, not promises</span>
              <h2>The work Helix took off the desk last month.</h2>
              <p>
                Every figure below is produced by the same engine that runs inside the
                app — each action cited, written to an immutable trail, and reversible.
              </p>
            </div>

            <div className="mk-roi reveal d1">
              <article className="mk-roi__hero">
                <span className="mk-roi__label">
                  <Sig id="peso" size={15} /> Revenue recovered
                </span>
                <div className="mk-roi__big">
                  <span className="mk-roi__cur">₱</span>385,200
                </div>
                <p className="mk-roi__note">
                  37 would-be denials caught before submission — flagged, fixed, and
                  re-checked ahead of the payer.
                </p>
                <div className="mk-roi__spark" aria-hidden="true">
                  {ROI_BARS.map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%`, animationDelay: `${0.12 + i * 0.035}s` }}
                    />
                  ))}
                </div>
              </article>

              <div className="mk-roi__stats">
                <div className="mk-roi__stat">
                  <span className="mk-roi__stat-ic">
                    <Icon name="shield" size={17} />
                  </span>
                  <div className="mk-roi__stat-n">37</div>
                  <div className="mk-roi__stat-l">Denials prevented</div>
                </div>
                <div className="mk-roi__stat">
                  <span className="mk-roi__stat-ic">
                    <Sig id="clock" size={17} />
                  </span>
                  <div className="mk-roi__stat-n">
                    22.6<span className="u">hrs</span>
                  </div>
                  <div className="mk-roi__stat-l">Front-desk time saved</div>
                </div>
                <div className="mk-roi__stat">
                  <span className="mk-roi__stat-ic">
                    <Icon name="pulse" size={17} />
                  </span>
                  <div className="mk-roi__stat-n">180</div>
                  <div className="mk-roi__stat-l">Verifications run</div>
                </div>
                <div className="mk-roi__stat">
                  <span className="mk-roi__stat-ic">
                    <Icon name="gauge" size={17} />
                  </span>
                  <div className="mk-roi__stat-n">
                    1.8<span className="u">s</span>
                  </div>
                  <div className="mk-roi__stat-l">Avg. time to verify</div>
                </div>
              </div>
            </div>

            <p className="mk-roi__cap mono reveal d2">
              Rolling 30-day snapshot · Helix Diagnostics, Makati · synthetic demo data
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mk-section" id="how" style={{ paddingTop: 0 }}>
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

        {/* WORKFORCE */}
        <section className="mk-section" id="agents" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="mk-head reveal">
              <span className="eyebrow">The workforce</span>
              <h2>Two agents live. A department that never sleeps.</h2>
              <p>
                Each teammate owns one repetitive workflow and shares the same approval,
                audit, and security foundation. Two are working today; the rest roll out
                on the same rails.
              </p>
            </div>

            <div className="mk-force-grid reveal d1">
              {LIVE_AGENTS.map((a) => (
                <article className="mk-force-card" key={a.name}>
                  <div className="mk-force-card__top">
                    <span className="mk-force-card__ic">
                      <Icon name={a.icon} />
                    </span>
                    <span className="mk-agent__status mk-agent__status--live">
                      <span className="mk-live__dot" /> Live
                    </span>
                  </div>
                  <h3>{a.name}</h3>
                  <p>{a.desc}</p>
                  <div className="mk-force-card__foot">
                    <span className="mk-force-card__cap">{a.capability}</span>
                    <span className="mk-force-card__metric mono">{a.metric}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mk-more reveal d2">
              <span className="mk-more__cap">
                <Sig id="spark" size={14} /> Rolling out next
              </span>
              <div className="mk-more__grid">
                {COMING_AGENTS.map((a) => (
                  <div className="mk-more__item" key={a.name}>
                    <span className="mk-more__ic">
                      <Icon name={a.icon} />
                    </span>
                    <span className="mk-more__body">
                      <span className="mk-more__name">{a.name}</span>
                      <span className="mk-more__desc">{a.desc}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section className="mk-section" id="security" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="mk-secure">
              <div className="mk-head reveal" style={{ marginBottom: 0 }}>
                <span className="eyebrow">Trust</span>
                <h2>Built for the most regulated work there is.</h2>
                <p>
                  Autonomy without oversight is a liability. Helix is engineered
                  secure-by-default: a human is always in the loop, and every action can
                  be traced to its source.
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

            {/* Immutable audit trail — the receipt behind every action */}
            <div className="mk-ledger reveal d2" aria-label="Sample immutable audit trail">
              <div className="mk-ledger__head">
                <span className="mk-ledger__title">
                  <Icon name="fingerprint" size={15} /> Immutable audit trail
                </span>
                <span className="mk-ledger__tag mono">append-only · hash-chained</span>
              </div>
              <div className="mk-ledger__rows">
                {LEDGER.map((r) => (
                  <div className="mk-ledger__row" key={r.hash}>
                    <span className={`mk-ledger__actor mk-ledger__actor--${r.kind}`}>
                      {r.actor}
                    </span>
                    <span className="mk-ledger__action mono">{r.action}</span>
                    <span className="mk-ledger__enc mono">{r.enc}</span>
                    <span className="mk-ledger__time mono">{r.time}</span>
                    <span className="mk-ledger__hash mono">
                      <Icon name="check" size={12} />
                      {r.hash}
                    </span>
                  </div>
                ))}
              </div>
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
                <span className="eyebrow mk-cta__eyebrow">Open the live app</span>
                <h2>See Helix on your own workflows.</h2>
                <p>
                  Run a verification end to end — eligibility, an LOA draft, cited
                  evidence, and a one-tap approval. No sign-up, no migration to start.
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
              <div className="mk-cta__aside" aria-hidden="true">
                <span className="mk-cta__stat-k mono">This month, for one clinic</span>
                <span className="mk-cta__stat-v">₱385,200</span>
                <span className="mk-cta__stat-l">recovered · 37 denials prevented</span>
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
            <h3>Product</h3>
            <a href="#product">Overview</a>
            <a href="#roi">Proof</a>
            <a href="#agents">Workforce</a>
            <Link href="/verify">Verify a walk-in</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
          <div className="mk-foot__col">
            <h3>Company</h3>
            <a href="#security">Security</a>
            <a href="#how">How it works</a>
            <a href="#top">Back to top</a>
          </div>
          <div className="mk-foot__col">
            <h3>Legal</h3>
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

// Deterministic upward trend for the ROI hero sparkline (percent heights).
const ROI_BARS = [34, 46, 40, 55, 48, 63, 57, 68, 62, 78, 84, 96] as const;

const LIVE_AGENTS = [
  {
    name: "Eligibility & Pre-Auth",
    desc: "Verifies coverage and clears authorizations before service is rendered — drafting the Letter of Authorization for your team to approve.",
    icon: "shield",
    capability: "Live for PhilHealth & Maxicare",
    metric: "1.8s / check",
  },
  {
    name: "Revenue Cycle",
    desc: "Triages denied and at-risk claims, classifies each to a fixed taxonomy, and drafts the appeal or resubmission — recoverable amount first.",
    icon: "pulse",
    capability: "Cited, auditable denial triage",
    metric: "₱385k / mo",
  },
] as const;

const COMING_AGENTS = [
  {
    name: "Documentation",
    desc: "Reads referrals, IDs, and physician notes into clean structured data.",
    icon: "doc",
  },
  {
    name: "Coding",
    desc: "Suggests ICD and case-rate codes, then validates the claim before it goes out.",
    icon: "hash",
  },
  {
    name: "Compliance",
    desc: "Answers instantly from your SOPs, accreditation manuals, and internal policy.",
    icon: "clipboard",
  },
  {
    name: "Executive",
    desc: "A daily brief on risk, bottlenecks, and revenue — recommendations, not a dashboard.",
    icon: "chart",
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

// Synthetic, illustrative audit lines (no PHI) — the receipt motif.
const LEDGER = [
  {
    actor: "agent · eligibility",
    kind: "agent",
    action: "eligibility.checked",
    enc: "enc_9f21",
    time: "09:32:04",
    hash: "a2f9c1",
  },
  {
    actor: "user · front-desk",
    kind: "user",
    action: "loa.approved",
    enc: "enc_9f21",
    time: "09:32:11",
    hash: "7b41e8",
  },
  {
    actor: "agent · revenue",
    kind: "agent",
    action: "denial.triaged",
    enc: "enc_6a55",
    time: "09:40:22",
    hash: "c14d07",
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
