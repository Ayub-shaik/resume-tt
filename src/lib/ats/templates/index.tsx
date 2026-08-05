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
import { TEMPLATE_META, type TemplateId, ensureResume } from "./shared";

export { TEMPLATE_META, type TemplateId };

export function isTemplateId(v: string): v is TemplateId {
  return TEMPLATE_META.some((t) => t.id === v);
}

export async function renderResumePdf(
  template: TemplateId,
  data: JsonResume,
): Promise<Buffer> {
  const resume = ensureResume(data);
  const map: Record<TemplateId, React.ReactElement<DocumentProps>> = {
    classic: <ClassicDocument data={resume} />,
    modern: <ModernDocument data={resume} />,
    compact: <CompactDocument data={resume} />,
    sidebar: <SidebarDocument data={resume} />,
    executive: <ExecutiveDocument data={resume} />,
    clean: <CleanDocument data={resume} />,
    timeline: <TimelineDocument data={resume} />,
    dual: <DualDocument data={resume} />,
    tech: <TechDocument data={resume} />,
    professional: <ProfessionalDocument data={resume} />,
    mono: <MonoDocument data={resume} />,
    kakuna: <ClassicDocument data={resume} />,
    charmander: <ModernDocument data={resume} />,
    meowth: <SidebarDocument data={resume} />,
    scizor: <TechDocument data={resume} />,
  };
  const buf = await renderToBuffer(map[template] || map.classic);
  return Buffer.from(buf);
}
