# Contributing to Helix

Helix is the AI operating layer for Philippine healthcare operations. This guide
covers the working agreements every contributor follows. Read it before opening a
pull request.

## Brain-first

The `brain/` directory is the source of truth for product, architecture, and
compliance decisions. **Before writing any code:**

1. Read `brain/00-INDEX.md` and the architecture notes it links
   (system-architecture, tech-stack, security-and-compliance, agent-catalog,
   delivery/vertical-slice-v0).
2. Read `packages/shared/src/*.ts` — the fixed domain contract. Import all domain
   types, zod schemas, and `Result` / `ProposedAction` from `@helix/shared`.
   Never redefine them.

If code and brain disagree, the brain wins — update the brain in the same PR when
a decision genuinely changes.

## The wedge: Eligibility & Pre-Auth

Our initial wedge is **Eligibility & Pre-Authorization** for Philippine payers
(Maxicare, Intellicare, Medicard, PhilHealth). Keep contributions focused on this
slice. Speculative features outside the wedge (YAGNI) are declined until the wedge
is proven.

## Administrative reasoning only

Helix performs **administrative** reasoning only — eligibility checks, coverage
lookup, pre-auth packaging, benefit interpretation. **No clinical logic** and no
medical decision-making.

- Payer rules come from fixtures and retrieval — never hallucinated.
- Every rule-based conclusion must be cited via `Evidence`.

## Mock-only data

- No real payer connections, no production PHI.
- Use realistic PH mock data: services like MRI/CBC/dialysis, patient names like
  Juan Dela Cruz, the payers listed above.
- Fixtures live alongside the packages that consume them.

## Human-in-the-loop approval

Helix proposes; humans approve. Agents emit a `ProposedAction` for any
state-changing or externally-visible operation. Never auto-execute an action that
would normally require a human operator's sign-off.

## No PHI in logs

- Never log protected health information — names, member IDs, diagnoses,
  clinical details.
- Validate all input at system boundaries with zod.
- No secrets in source. Use environment variables.

## Code standards

- TypeScript, ESM (`"type": "module"`), `strict` mode.
- Small, cohesive files (< 400 lines). Match the style of `packages/shared`.
- Import internal packages by name: `@helix/shared`, `@helix/db`, `@helix/payers`,
  `@helix/llm`, `@helix/core`. Use extensionless relative imports within a package.
- Each package ships `typecheck`, `lint`, and `test` scripts. Add vitest tests for
  real logic; target 80%+ coverage.

## Local checks

Node 20 (see `.nvmrc`) and pnpm 9. Before pushing:

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run format
```

CI runs the same typecheck + lint + test on every push and pull request.

## Conventional commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Examples:

```
feat: add Maxicare eligibility fixture loader
fix: correct PhilHealth benefit ceiling lookup
docs: clarify pre-auth approval flow in CONTRIBUTING
```

Keep PRs focused, describe the change and its test plan, and ensure all checks
pass before requesting review.
