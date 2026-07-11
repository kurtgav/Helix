// Single inline SVG sprite rendered once in the root layout. Every icon across
// the marketing site and the product references these symbols via <use>, so the
// iconography is one consistent system. High-end line icons: 24-grid, 1.5 stroke.
export function Sprite() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <symbol id="i-helix" viewBox="0 0 24 24">
          <path d="M7 3c0 4.5 10 6 10 9s-10 4.5-10 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M17 3c0 4.5-10 6-10 9s10 4.5 10 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8.5 6.2h7M8.5 17.8h7M6.6 12h10.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-layers" viewBox="0 0 24 24">
          <path d="M12 3 21 8l-9 5-9-5 9-5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3 13.5 12 18.5l9-5M3 17 12 22l9-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m9 12 2 2 4-4.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-pulse" viewBox="0 0 24 24">
          <path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-doc" viewBox="0 0 24 24">
          <path d="M6 3h7l5 5v13H6V3Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M13 3v5h5M9 13h6M9 16.5h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-hash" viewBox="0 0 24 24">
          <path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-clipboard" viewBox="0 0 24 24">
          <path d="M9 4h6v3H9V4Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 5.5H6v15h12v-15h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m9 13 1.8 1.8L14 11.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-chart" viewBox="0 0 24 24">
          <path d="M4 4v16h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 15l3.2-4 3 2.4L20 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-lock" viewBox="0 0 24 24">
          <path d="M6 10.5h12V21H6V10.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5M12 15v2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24">
          <path d="m5 12.5 4 4L19 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-alert" viewBox="0 0 24 24">
          <path d="M12 4 3 20h18L12 4Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 10v4M12 17h.01" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24">
          <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-plug" viewBox="0 0 24 24">
          <path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0V8Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 16v5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-gauge" viewBox="0 0 24 24">
          <path d="M4 15a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 15l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="15" r="1.4" fill="currentColor" />
        </symbol>
        <symbol id="i-fingerprint" viewBox="0 0 24 24">
          <path d="M12 11v3.5M8.5 8.8a5 5 0 0 1 7 .2M6.5 12a7.5 7.5 0 0 1 .8-3.4M9 14.5c.3 2 .1 3.4-.6 4.8M12 10a2.4 2.4 0 0 1 2.4 2.4c0 2.6.3 4.6 1.2 6.4M15.5 16.5c.2 1 .5 1.8.9 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-users" viewBox="0 0 24 24">
          <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3 3 0 0 1 0 5.6M17 14.4A5.5 5.5 0 0 1 20.5 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
      </defs>
    </svg>
  );
}
