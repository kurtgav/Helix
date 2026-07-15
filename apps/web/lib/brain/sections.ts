import type { Dict } from "@/lib/i18n";
import type { BrainSection } from "./types";

// Localized display copy per vault section — one mapping shared by the list
// page (section group headers) and the note page (breadcrumb), so a renamed
// section can never drift between the two surfaces.

export interface BrainSectionCopy {
  title: string;
  sub: string;
}

export function sectionTitles(
  t: Dict["brain"],
): Record<BrainSection, BrainSectionCopy> {
  return {
    root: { title: t.sectionRootTitle, sub: t.sectionRootSub },
    strategy: { title: t.sectionStrategyTitle, sub: t.sectionStrategySub },
    architecture: { title: t.sectionArchitectureTitle, sub: t.sectionArchitectureSub },
    loop: { title: t.sectionLoopTitle, sub: t.sectionLoopSub },
    delivery: { title: t.sectionDeliveryTitle, sub: t.sectionDeliverySub },
  };
}
