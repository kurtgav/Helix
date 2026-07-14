import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";

// Rendered when the acting role lacks brain.read (viewer). The gate is real:
// the same permission also 403s the search-index API, so this panel is honest
// UI over server enforcement — not the enforcement itself.

export function AccessNotice() {
  return (
    <Card className="brain-denied" role="status">
      <span className="brain-denied__icon" aria-hidden="true">
        <Icon name="lock" size={20} />
      </span>
      <h2 className="brain-denied__title">The brain is staff-only</h2>
      <p className="brain-denied__text">
        Company memory — strategy, architecture and the decision log — is readable by
        staff and above. Your current role (<strong>viewer</strong>) is external
        read-only reporting, which does not include <code>brain.read</code>.
      </p>
      <p className="brain-denied__hint">
        Use the “Acting as” switcher in the top bar to continue as staff, admin or owner.
      </p>
    </Card>
  );
}
