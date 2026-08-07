import { NextResponse } from "next/server";
import { benchmarkTriple } from "@tomorrowtools/resume-brain";
import {
  brainImproveChain,
  brainImproveMore,
  brainImprovePass,
} from "@/lib/brain/client";
import { scoreTriple } from "@/lib/ats/keywords";
import type { ImproveFocus, ResumeVersion } from "@/lib/ats/keywords";

export const runtime = "nodejs";

type Body = {
  action?: "chain" | "pass" | "more";
  masterResume: string;
  currentResume?: string;
  jdText?: string;
  targetRole?: string;
  targetVersion?: ResumeVersion;
  currentVersion?: ResumeVersion;
  focus?: ImproveFocus;
  matchScore?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const master = String(body.masterResume || "").trim();
    if (!master) {
      return NextResponse.json({ error: "masterResume required" }, { status: 400 });
    }
    const jdText = String(body.jdText || "");
    const targetRole = String(body.targetRole || "");
    const matchScore =
      Number(body.matchScore) ||
      scoreTriple(master, jdText, targetRole).overall;

    const action = body.action || "pass";

    if (action === "chain") {
      const targetVersion = (body.targetVersion || 1) as ResumeVersion;
      const chain = await brainImproveChain({
        masterResume: master,
        jdText,
        targetRole,
        targetVersion,
        focus: body.focus,
        matchScore,
      });
      return NextResponse.json({
        chain,
        benchmark: chain.versions.map((v) =>
          benchmarkTriple(v.resumeMd, jdText, v.scores),
        ),
      });
    }

    if (action === "more") {
      const current = String(body.currentResume || master).trim();
      const currentVersion = (body.currentVersion || 1) as ResumeVersion;
      const pass = await brainImproveMore({
        masterResume: master,
        currentResume: current,
        currentVersion,
        jdText,
        targetRole,
        matchScore,
        focus: body.focus,
      });
      return NextResponse.json({
        pass,
        benchmark: benchmarkTriple(pass.resumeMd, jdText, pass.scores),
      });
    }

    const current = String(body.currentResume || master).trim();
    const version = (body.currentVersion || 1) as ResumeVersion;
    const pass = await brainImprovePass({
      masterResume: master,
      currentResume: current,
      jdText,
      targetRole,
      version,
      focus: body.focus || "balanced",
      matchScore,
    });
    return NextResponse.json({
      pass,
      preScores: scoreTriple(current, jdText, targetRole),
      benchmark: benchmarkTriple(pass.resumeMd, jdText, pass.scores),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
