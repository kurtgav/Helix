---
name: competitive-landscape
type: strategy
updated: 2026-07-14
status: draft — scan from iteration-6 research, PH-domestic gaps still ⚠️ VALIDATE
---

# Competitive Landscape

> Structured scan of who is credible in agentic healthcare back-office (prior-auth, eligibility, RCM, denials) and where Helix actually differs. Anchor note: [[product-os-thesis]]. Bias check: almost every funded comparable is **US-centric** and rides **rails our ICP doesn't own** (US payers, US codes, an EHR/clearinghouse). That is the whole opening.

## The category shape

Two venture theses describe the same wave:
- **Services-as-software** — agents that *do* the work, targeting the **$4.6T** labor/services spend, not the SaaS pool ([Foundation Capital](https://foundationcapital.com/ideas/the-4-6t-services-as-software-opportunity-lessons-from-the-first-year)).
- **Vertical AI** — industry-specialized agents shifting software "from a system of record to a system of actions," landing on a wedge then expanding into a workforce ([NEA](https://www.nea.com/blog/tomorrows-titans-vertical-ai)).

In healthcare the wave is concentrated on the **insurance side of the revenue cycle** — claims, authorizations, denials ([Gartner 2026, via PatientPay](https://www.patientpay.com/blog/agentic-ai-revenue-cycle-whats-ready-whats-not-what-to-buy-first)). Everyone converges on the same primitive Helix already chose: **read → check payer rules → draft → human-approve → track → audit**.

## Global / US comparables

| Company | What it does | Side of table | Geo / rails | Raised (approx) | Where Helix differs |
|---|---|---|---|---|---|
| **Cohere Health** | Automates prior-auth **decisioning** for health plans; 12M PA/yr; "no claim denied by AI alone" | **Payer** | US | $200M total ([MedCity](https://medcitynews.com/2025/05/healthcare-hospital-insurance-tech-ai/)) | Helix is **provider-side** of a **different** payer system (PhilHealth+HMO). Opposite seat. |
| **Anterior** (ex-Co:Helm) | Clinical PA co-pilot "Florence" for payers; 50M+ lives; 99.24% claimed accuracy | **Payer** | US | ~$64M ([TechCrunch](https://techcrunch.com/2024/06/08/anterior-grabs-20m-from-nea-at-95m-valuation-to-expedite-health-insurance-approvals-with-ai/)) | Same — payer-side, clinical decisioning. Helix is administrative-only, provider-side. |
| **Commure / Athelas** | "Healthcare AI **operating system**": ambient + agentic + RCM on one platform; 85%+ RCM touchless | Provider (health systems) | US, 60+ EHRs | ~$7B valuation ([Fierce](https://www.fiercehealthcare.com/ai-and-machine-learning/ai-company-commure-banks-70m-funding-round-hits-7b-valuation)) | The clearest "OS" proof-point — but **built on EHR rails our ICP lacks**. Helix serves the HIS-less clinic. |
| **Tennr** | Reads/parses/routes referrals + intake docs (front office); 10M docs/mo | Provider | US | $101M, $605M val ([Fierce](https://www.fiercehealthcare.com/health-tech/tennr-clinches-101m-build-out-ai-automates-patient-referral-workflows)) | Doc-intake wedge, US referral system. Overlaps our Documentation agent; different payer world. |
| **Akasa** | GenAI across RCM (PA→CDI→coding→claims), trained on each system's own data | Provider (health systems) | US | n/d ([akasa.com](https://akasa.com/)) | US codes/EHR; enterprise health-system ICP vs our SMB clinics. |
| **Adonis** | AI orchestration for RCM: detect issues, progress claims to resolution | Provider | US | $95M+, 130%+ NRR ([PR](https://www.prnewswire.com/news-releases/adonis-raises-40m-series-c-to-equip-healthcare-providers-with-aidriven-revenue-cycle-operations-302722199.html)) | US payer/clearinghouse dependency; larger providers. |
| **Candid Health** | RCM automation; 200+ orgs; 95%+ touchless claims | Provider | US | n/d ([Beckers](https://www.beckershospitalreview.com/healthcare-information-technology/385-revenue-cycle-management-companies-to-know-2026/)) | US billing rails. |
| **Thoughtful AI** | "Human-capable" AI agents for RCM tasks | Provider | US | n/d | US RCM; agent-labor framing similar to ours, wrong geography. |
| **SmarterDx** | Clinical AI for revenue integrity + **SmarterDenials** (AI appeal letters) | Provider (hospitals) | US | $50M+ ([SmarterDx](https://www.smarterdx.com/resources/smarterdx-raises-50m-to-bolster-hospital-revenue-integrity-and-quality-with-its-clinical-ai-solution)) | Post-denial appeals for US hospitals; Helix attacks denials **pre-service**. |
| **Infinitus** | Voice AI agents calling US payors/PBMs for benefit verification + PA follow-up | Provider / pharma | US | $103M ([startupintros](https://startupintros.com/orgs/infinitus-systems)) | Voice-first, US payor phone trees. A tactic (call-center automation) we may borrow per-adapter, not a competitor for our ICP. |

**Pattern:** every one assumes **US payers, US codes, and an EHR/clearinghouse substrate**. Their moats (EHR integrations, US payer rule libraries, clinical PA accuracy) **do not transfer** to a Manila diagnostic center dealing with Maxicare's portal and PhilHealth eClaims. Their capital does, though — see incumbent-risk in [[product-os-thesis]].

## PH / SEA players and the gap

| Player | What it is | Overlap with Helix |
|---|---|---|
| **SeriousMD** | Leading PH clinic **EMR** / practice-mgmt + telemedicine ([SeriousMD](https://seriousmd.com/)) | **The closest thing to a PH system-of-record.** Owns the clinic desktop but does **not** do payer-friction automation. Biggest "could-bolt-this-on" threat — and a possible **integration/partner** surface, not a head-to-head. |
| **Hati Health** | **Patient-side** marketplace: patient books, picks HMO as payment, uploads docs, ~1–2 day approval, concierge ([Hati](https://hati.health/)) | Adjacent, **opposite user**. Facilitates the *patient's* LOA; Helix automates the *clinic's* verify/LOA/denial workflow. Signals the friction is real and monetizable. |
| **Hive Health** | Hassle-free **HMO plans** for SMEs; $6.5M pre-Series-A ([StartupNews.ph](https://startupnews.ph/article/philippine-healthtech-startups-digital-innovation)) | Payer/plan side (a mini-HMO). Could be a future *payer partner* to integrate, not a competitor. |
| **mWell / KonsultaMD / Medgate / HealthNow / AIDE / SeeYouDoc** | Telehealth / consumer care delivery | Different problem (consult delivery), not back-office payer automation. |
| **HMO portals** (Maxicare Member Gateway, Intellicare, MediCard, Cocolife eLOA) | Each HMO's own eLOA/dLOA request flow ([Hati FAQ](https://hati.health/faq)) | **This is the fragmentation Helix abstracts.** They are the *rails/targets* of our adapters, not competitors — and their per-payer inconsistency is our moat surface. |
| **PhilHealth eClaims 3.0** | Mandatory electronic claims by ~Apr 2026; electronic SOA required ([PIA](https://pia.gov.ph/news/philhealth-to-disable-old-eclaims-systems-version-3-0-mandatory-by-april-2026/)) | A tailwind: forced digitization = more structure to integrate against. |
| **PH healthcare BPO / RCM** | 400+ HIMS firms doing eligibility/PA/coding for **US** clients at 40–60% cost advantage ([Piton Global](https://www.piton-global.com/blog/healthcare-outsourcing-philippines-intelligent-automation-transforming-clinical-revenue-operations-2026-guide/)) | Double-edged: proves the work is automatable + local talent is deep, **but** it serves US payers, not domestic clinics — and it is the cheap manual alternative our ROI must beat locally. |

### The white space
No credible player is doing **clinic-side, PH-domestic, payer-friction automation (PhilHealth + HMO LOA), pre-service, for small diagnostic centers/clinics that often lack an HIS.** US players are payer-side or EHR-integrated provider-side; PH players are telehealth, consumer, EMR, or plans; Hati is patient-side. The seam Helix targets is genuinely unoccupied ([[wedge-and-icp]], [[problem-validation]]).

### Caveats
- `⚠️ VALIDATE` — "unoccupied" is from public web signal only. A quiet local incumbent, an HMO's in-house tool, or a BPO's internal automation could already serve slices of this. Confirm via real clinic + payer interviews ([[open-questions]]).
- Funding/metric figures are as reported by the companies and press; several (accuracy %, touchless %, NRR) are **vendor-stated** — treat as directional, not audited.
- Market-size projections (APAC RCM, PH digital-health ~$1B by 2025) are analyst reports; cite as directional, not fact.

Cross-ref: [[product-os-thesis]] · [[ph-payer-landscape]] · [[wedge-and-icp]] · [[business-model]].
