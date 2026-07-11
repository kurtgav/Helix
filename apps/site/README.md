# apps/site — Helix marketing site

Static, self-contained landing page. Intentionally **not** a workspace package (no `package.json`) so it stays out of the pnpm/turbo build graph — the product app lives in `apps/web`.

- `index.html` — full landing page. Zero external requests: inline CSS, inline SVG iconography, no webfonts (tuned system stack), tiny vanilla-JS progressive enhancement (scroll reveals, reduced-motion safe).

## Design
- **Light-locked** by request; deliberate single visual world.
- Monochrome ink brand on a cool off-white ground; color used only as semantic signal (deep teal-green = pass/live, deep brick = blocking gap).
- Display = tuned system sans; labels/IDs/timestamps = technical mono (a healthcare OS speaks in records + audit hashes).
- Hero thesis = the real product moment: a live Eligibility & Pre-Auth "proposed action" card.
- No emojis. High-end line iconography (24-grid, 1.5 stroke) via an inline `<symbol>` sprite.

## Preview
Open `index.html` directly, or serve it:
```bash
npx serve apps/site      # or: python -m http.server -d apps/site 8080
```

> Interface shown with synthetic data. See `brain/delivery/vertical-slice-v0.md` for the product being built in `apps/web`.
