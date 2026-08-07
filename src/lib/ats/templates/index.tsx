import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { JsonResume } from "@/lib/ats/jsonresume";
import { ClassicDocument } from "./Classic";
import { ModernDocument } from "./Modern";
import { CompactDocument } from "./Compact";
import { SidebarDocument } from "./Sidebar";
import { ExecutiveDocument } from "./Executive";
import { CleanDocument } from "./Clean";
import { TimelineDocument } from "./Timeline";
import { DualDocument } from "./Dual";
import { TechDocument } from "./Tech";
import { ProfessionalDocument } from "./Professional";
import { MonoDocument } from "./Mono";
import { VariantDocument } from "./Variants";
import { TEMPLATE_META, type TemplateId, ensureResume } from "./shared";

export {
  TEMPLATE_META,
  TEMPLATE_CATEGORY_ORDER,
  isTemplateId,
  type TemplateId,
  type TemplateCategory,
} from "./shared";

const CORE: Partial<
  Record<TemplateId, (resume: ReturnType<typeof ensureResume>) => React.ReactElement<DocumentProps>>
> = {
  classic: (resume) => <ClassicDocument data={resume} />,
  modern: (resume) => <ModernDocument data={resume} />,
  compact: (resume) => <CompactDocument data={resume} />,
  sidebar: (resume) => <SidebarDocument data={resume} />,
  executive: (resume) => <ExecutiveDocument data={resume} />,
  clean: (resume) => <CleanDocument data={resume} />,
  timeline: (resume) => <TimelineDocument data={resume} />,
  dual: (resume) => <DualDocument data={resume} />,
  tech: (resume) => <TechDocument data={resume} />,
  professional: (resume) => <ProfessionalDocument data={resume} />,
  mono: (resume) => <MonoDocument data={resume} />,
};

export async function renderResumePdf(
  template: TemplateId,
  data: JsonResume,
): Promise<Buffer> {
  const resume = ensureResume(data);
  const meta = TEMPLATE_META.find((t) => t.id === template);
  let doc: React.ReactElement<DocumentProps>;
  if (meta?.variant) {
    doc = <VariantDocument data={resume} opts={meta.variant} />;
  } else {
    const factory = CORE[template] || CORE.classic!;
    doc = factory(resume);
  }
  const buf = await renderToBuffer(doc);
  return Buffer.from(buf);
}
