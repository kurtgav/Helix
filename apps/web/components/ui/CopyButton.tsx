"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

// Copies a drafted letter to the clipboard — the smallest affordance that
// turns a read-only draft into something a biller can actually use. Falls
// back silently to the selection API being unavailable (button simply keeps
// its label) rather than crashing a page over a convenience.

const COPIED_RESET_MS = 2000;

interface Props {
  text: string;
  label: string;
  copiedLabel: string;
}

export function CopyButton({ text, label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave the
      // label unchanged; the draft is still selectable by hand.
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={handleCopy} aria-live="polite">
      <Icon name={copied ? "check" : "doc"} size={13} />
      {copied ? copiedLabel : label}
    </button>
  );
}
