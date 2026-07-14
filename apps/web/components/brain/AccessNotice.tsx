import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import type { Dict } from "@/lib/i18n";

// Rendered when the acting role lacks brain.read (viewer). The gate is real:
// the same permission also 403s the search-index API, so this panel is honest
// UI over server enforcement — not the enforcement itself.

export function AccessNotice({ t }: { t: Dict["brain"] }) {
  return (
    <Card className="brain-denied" role="status">
      <span className="brain-denied__icon" aria-hidden="true">
        <Icon name="lock" size={20} />
      </span>
      <h2 className="brain-denied__title">{t.deniedTitle}</h2>
      <p className="brain-denied__text">{t.deniedText}</p>
      <p className="brain-denied__hint">{t.deniedHint}</p>
    </Card>
  );
}
