import { z } from "zod";
import type { InterviewerPayload } from "../types";

const RatingSchema = z.enum([
  "Excellent",
  "Strong",
  "Good",
  "Average",
  "Weak",
  "Poor",
]);

const DimensionSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(10),
  note: z.string().optional(),
});

const EvalV1Schema = z
  .object({
    version: z.string().optional(),
    dimensions: z.array(DimensionSchema).default([]),
    evidence: z.array(z.string()).optional(),
    nextPracticeTarget: z.string().optional(),
  })
  .optional();

const EvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  rating: RatingSchema,
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  whatWentWrong: z.string().default(""),
  howToImprove: z.string().default(""),
  enterpriseImprovements: z.array(z.string()).default([]),
  seniorAnswer: z.string().default(""),
  resumeJdAlignment: z.string().default(""),
  traps: z.array(z.string()).default([]),
  evalV1: EvalV1Schema,
});

const PayloadSchema = z.object({
  action: z.enum(["ask", "evaluate", "final", "role"]),
  interviewerRole: z.string().optional(),
  speak: z.string().optional(),
  question: z.string().optional(),
  questionType: z.enum(["chat", "code"]).optional(),
  codePrompt: z.string().nullable().optional(),
  evaluation: EvaluationSchema.optional(),
  followUps: z
    .array(
      z.object({
        question: z.string(),
        modelAnswer: z.string(),
      }),
    )
    .optional(),
  recommendedNext: z.string().optional(),
  nextQuestion: z.string().optional(),
  nextQuestionType: z.enum(["chat", "code"]).optional(),
  nextCodePrompt: z.string().nullable().optional(),
  finalScore: z.number().min(0).max(10).optional(),
  finalSummary: z.string().optional(),
  reviewStrengths: z.array(z.string()).optional(),
  reviewGaps: z.array(z.string()).optional(),
  dimensionScores: z.array(DimensionSchema).optional(),
  nextPracticeTarget: z.string().optional(),
  interviewComplete: z.boolean().optional(),
});

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain JSON object");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export function parseInterviewerPayload(text: string): InterviewerPayload {
  const parsed = PayloadSchema.parse(extractJson(text));
  return parsed as InterviewerPayload;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type RuntimeResult = {
  text: string;
  runtime: "cursor" | "openclaw";
  cursorAgentId?: string;
};

export function resolvePreferredRuntime(
  override?: "auto" | "cursor" | "openclaw" | null,
): "cursor" | "openclaw" {
  const mode = (
    override && override !== "auto"
      ? override
      : process.env.AI_RUNTIME || "auto"
  ).toLowerCase();
  const hasCursor = Boolean(process.env.CURSOR_API_KEY?.trim());
  if (mode === "cursor") return "cursor";
  if (mode === "openclaw") return "openclaw";
  return hasCursor ? "cursor" : "openclaw";
}
