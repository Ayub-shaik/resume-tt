import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  Evaluation,
  FollowUp,
  Interview,
  InterviewStatus,
  QuestionType,
  Resume,
  ResumeScore,
  Turn,
  AnswerMode,
  AiRuntimeUsed,
  ReviewPack,
  RuntimePreference,
  CoachAsk,
  CoachAskMessage,
  EvalDimensionScore,
} from "./types";
import { computeContextFingerprint } from "./context";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH =
  process.env.TT_DB_PATH || path.join(DATA_DIR, "resume-tt.sqlite");

let db: Database.Database | null = null;

function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  ddl: string,
) {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  if (!cols.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function getDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      resume_id TEXT,
      resume_text TEXT NOT NULL DEFAULT '',
      jd_text TEXT NOT NULL DEFAULT '',
      jd_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'setup',
      interviewer_role TEXT,
      final_score REAL,
      final_summary TEXT,
      runtime_used TEXT,
      cursor_agent_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS turns (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      question TEXT NOT NULL,
      question_type TEXT NOT NULL DEFAULT 'chat',
      code_prompt TEXT,
      answer TEXT,
      answer_mode TEXT,
      code_answer TEXT,
      evaluation_json TEXT,
      recommended_next TEXT,
      followups_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (interview_id) REFERENCES interviews(id)
    );

    CREATE TABLE IF NOT EXISTS review_packs (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL UNIQUE,
      summary TEXT NOT NULL,
      strengths_json TEXT NOT NULL DEFAULT '[]',
      gaps_json TEXT NOT NULL DEFAULT '[]',
      followup_bank_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (interview_id) REFERENCES interviews(id)
    );

    CREATE TABLE IF NOT EXISTS coach_asks (
      id TEXT PRIMARY KEY,
      turn_id TEXT NOT NULL,
      interview_id TEXT NOT NULL,
      field TEXT NOT NULL,
      item_index INTEGER,
      messages_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ats_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      step TEXT NOT NULL DEFAULT 'prepare',
      resume_text TEXT NOT NULL DEFAULT '',
      jd_text TEXT NOT NULL DEFAULT '',
      original_text TEXT NOT NULL DEFAULT '',
      improved_text TEXT NOT NULL DEFAULT '',
      json_resume_json TEXT,
      analysis_json TEXT,
      template_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recovery_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resource_id TEXT,
      action TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      checkpoint TEXT NOT NULL DEFAULT 'accepted',
      provider TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      request_json TEXT NOT NULL,
      result_json TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS memory_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      source_cursor TEXT,
      created_at TEXT NOT NULL
    );
  `);

  ensureColumn(db, "interviews", "interviewer_role", "interviewer_role TEXT");
  ensureColumn(db, "interviews", "parent_interview_id", "parent_interview_id TEXT");
  ensureColumn(db, "interviews", "context_fingerprint", "context_fingerprint TEXT");
  ensureColumn(
    db,
    "interviews",
    "experience_notes",
    "experience_notes TEXT NOT NULL DEFAULT ''",
  );
  ensureColumn(
    db,
    "interviews",
    "runtime_preference",
    "runtime_preference TEXT NOT NULL DEFAULT 'auto'",
  );
  ensureColumn(db, "interviews", "user_id", "user_id TEXT");
  ensureColumn(db, "interviews", "interviewer_persona", "interviewer_persona TEXT");
  ensureColumn(db, "resumes", "user_id", "user_id TEXT");
  ensureColumn(db, "resumes", "score_json", "score_json TEXT");
  ensureColumn(
    db,
    "review_packs",
    "hiring_verdict_json",
    "hiring_verdict_json TEXT",
  );
  ensureColumn(db, "turns", "recommended_next", "recommended_next TEXT");
  ensureColumn(
    db,
    "review_packs",
    "dimensions_json",
    "dimensions_json TEXT NOT NULL DEFAULT '[]'",
  );
  ensureColumn(
    db,
    "review_packs",
    "next_practice_target",
    "next_practice_target TEXT",
  );

  return db;
}

export function withDatabase<T>(fn: (database: Database.Database) => T): T {
  return fn(getDb());
}

function mapResume(row: Record<string, unknown>): Resume {
  return {
    id: String(row.id),
    name: String(row.name),
    content: String(row.content),
    userId: row.user_id ? String(row.user_id) : null,
    scoreJson: row.score_json
      ? (JSON.parse(String(row.score_json)) as ResumeScore)
      : null,
    createdAt: String(row.created_at),
  };
}

function mapInterview(row: Record<string, unknown>): Interview {
  return {
    id: String(row.id),
    name: String(row.name),
    resumeId: row.resume_id ? String(row.resume_id) : null,
    resumeText: String(row.resume_text ?? ""),
    jdText: String(row.jd_text ?? ""),
    jdUrl: String(row.jd_url ?? ""),
    experienceNotes: String(row.experience_notes ?? ""),
    contextFingerprint: row.context_fingerprint
      ? String(row.context_fingerprint)
      : null,
    parentInterviewId: row.parent_interview_id
      ? String(row.parent_interview_id)
      : null,
    runtimePreference: (String(row.runtime_preference || "auto") ||
      "auto") as RuntimePreference,
    status: String(row.status) as InterviewStatus,
    interviewerRole: row.interviewer_role
      ? String(row.interviewer_role)
      : null,
    finalScore: row.final_score == null ? null : Number(row.final_score),
    finalSummary: row.final_summary ? String(row.final_summary) : null,
    runtimeUsed: row.runtime_used
      ? (String(row.runtime_used) as AiRuntimeUsed)
      : null,
    cursorAgentId: row.cursor_agent_id ? String(row.cursor_agent_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    interviewerPersona: row.interviewer_persona
      ? String(row.interviewer_persona)
      : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTurn(row: Record<string, unknown>): Turn {
  return {
    id: String(row.id),
    interviewId: String(row.interview_id),
    sequence: Number(row.sequence),
    question: String(row.question),
    questionType: String(row.question_type) as QuestionType,
    codePrompt: row.code_prompt ? String(row.code_prompt) : null,
    answer: row.answer ? String(row.answer) : null,
    answerMode: row.answer_mode ? (String(row.answer_mode) as AnswerMode) : null,
    codeAnswer: row.code_answer ? String(row.code_answer) : null,
    evaluation: row.evaluation_json
      ? (JSON.parse(String(row.evaluation_json)) as Evaluation)
      : null,
    recommendedNext: row.recommended_next
      ? String(row.recommended_next)
      : null,
    followUps: JSON.parse(String(row.followups_json || "[]")) as FollowUp[],
    createdAt: String(row.created_at),
  };
}

function mapReviewPack(row: Record<string, unknown>): ReviewPack {
  return {
    id: String(row.id),
    interviewId: String(row.interview_id),
    summary: String(row.summary),
    strengths: JSON.parse(String(row.strengths_json || "[]")) as string[],
    gaps: JSON.parse(String(row.gaps_json || "[]")) as string[],
    followUpBank: JSON.parse(
      String(row.followup_bank_json || "[]"),
    ) as FollowUp[],
    dimensionScores: JSON.parse(
      String(row.dimensions_json || "[]"),
    ) as EvalDimensionScore[],
    nextPracticeTarget: row.next_practice_target
      ? String(row.next_practice_target)
      : null,
    createdAt: String(row.created_at),
  };
}

function mapCoachAsk(row: Record<string, unknown>): CoachAsk {
  return {
    id: String(row.id),
    turnId: String(row.turn_id),
    interviewId: String(row.interview_id),
    field: String(row.field) as CoachAsk["field"],
    itemIndex: row.item_index == null ? null : Number(row.item_index),
    messages: JSON.parse(String(row.messages_json || "[]")) as CoachAskMessage[],
    createdAt: String(row.created_at),
  };
}

export function listResumes(userId?: string | null): Resume[] {
  if (userId) {
    return getDb()
      .prepare(
        "SELECT * FROM resumes WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC",
      )
      .all(userId)
      .map((r) => mapResume(r as Record<string, unknown>));
  }
  return getDb()
    .prepare("SELECT * FROM resumes ORDER BY created_at DESC")
    .all()
    .map((r) => mapResume(r as Record<string, unknown>));
}

export function getResume(id: string): Resume | null {
  const row = getDb().prepare("SELECT * FROM resumes WHERE id = ?").get(id);
  return row ? mapResume(row as Record<string, unknown>) : null;
}

export function createResume(
  name: string,
  content: string,
  userId?: string | null,
): Resume {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO resumes (id, name, content, user_id, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, name, content, userId ?? null, createdAt);
  return getResume(id)!;
}

export function updateResumeScore(id: string, score: ResumeScore): Resume | null {
  getDb()
    .prepare("UPDATE resumes SET score_json = ? WHERE id = ?")
    .run(JSON.stringify(score), id);
  return getResume(id);
}

/** Deletes a resume. Returns true if a row was removed. */
export function deleteResume(id: string, userId?: string | null): boolean {
  const existing = getResume(id);
  if (!existing) return false;
  if (userId && existing.userId && existing.userId !== userId) return false;
  const result = getDb().prepare("DELETE FROM resumes WHERE id = ?").run(id);
  return Number(result.changes) > 0;
}

export function listInterviews(userId?: string | null): Interview[] {
  if (userId) {
    return getDb()
      .prepare(
        "SELECT * FROM interviews WHERE user_id = ? OR user_id IS NULL ORDER BY updated_at DESC",
      )
      .all(userId)
      .map((r) => mapInterview(r as Record<string, unknown>));
  }
  return getDb()
    .prepare("SELECT * FROM interviews ORDER BY updated_at DESC")
    .all()
    .map((r) => mapInterview(r as Record<string, unknown>));
}

export function getInterview(id: string): Interview | null {
  const row = getDb().prepare("SELECT * FROM interviews WHERE id = ?").get(id);
  return row ? mapInterview(row as Record<string, unknown>) : null;
}

export function createInterview(
  name = "New interview",
  opts?: {
    parentInterviewId?: string | null;
    resumeId?: string | null;
    resumeText?: string;
    jdText?: string;
    jdUrl?: string;
    experienceNotes?: string;
    runtimePreference?: RuntimePreference;
    contextFingerprint?: string | null;
    status?: InterviewStatus;
    userId?: string | null;
    interviewerPersona?: string | null;
  },
): Interview {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO interviews
      (id, name, resume_id, resume_text, jd_text, jd_url, experience_notes,
       context_fingerprint, parent_interview_id, runtime_preference,
       status, interviewer_role, user_id, interviewer_persona, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    )
    .run(
      id,
      name,
      opts?.resumeId ?? null,
      opts?.resumeText ?? "",
      opts?.jdText ?? "",
      opts?.jdUrl ?? "",
      opts?.experienceNotes ?? "",
      opts?.contextFingerprint ?? null,
      opts?.parentInterviewId ?? null,
      opts?.runtimePreference ?? "auto",
      opts?.status ?? "setup",
      opts?.userId ?? null,
      opts?.interviewerPersona ?? null,
      now,
      now,
    );
  return getInterview(id)!;
}

export function ensureDraftInterview(userId?: string | null): Interview {
  const list = listInterviews(userId);
  if (list.length) return list[0]!;
  return createInterview("New interview", { userId });
}

export function updateInterview(
  id: string,
  patch: Partial<{
    name: string;
    resumeId: string | null;
    resumeText: string;
    jdText: string;
    jdUrl: string;
    experienceNotes: string;
    contextFingerprint: string | null;
    parentInterviewId: string | null;
    runtimePreference: RuntimePreference;
    status: InterviewStatus;
    interviewerRole: string | null;
    finalScore: number | null;
    finalSummary: string | null;
    runtimeUsed: AiRuntimeUsed | null;
    cursorAgentId: string | null;
    userId: string | null;
    interviewerPersona: string | null;
  }>,
): Interview | null {
  const current = getInterview(id);
  if (!current) return null;
  const next = {
    name: patch.name ?? current.name,
    resumeId: patch.resumeId !== undefined ? patch.resumeId : current.resumeId,
    resumeText: patch.resumeText ?? current.resumeText,
    jdText: patch.jdText ?? current.jdText,
    jdUrl: patch.jdUrl ?? current.jdUrl,
    experienceNotes:
      patch.experienceNotes !== undefined
        ? patch.experienceNotes
        : current.experienceNotes,
    contextFingerprint:
      patch.contextFingerprint !== undefined
        ? patch.contextFingerprint
        : current.contextFingerprint,
    parentInterviewId:
      patch.parentInterviewId !== undefined
        ? patch.parentInterviewId
        : current.parentInterviewId,
    runtimePreference:
      patch.runtimePreference !== undefined
        ? patch.runtimePreference
        : current.runtimePreference,
    status: patch.status ?? current.status,
    interviewerRole:
      patch.interviewerRole !== undefined
        ? patch.interviewerRole
        : current.interviewerRole,
    finalScore:
      patch.finalScore !== undefined ? patch.finalScore : current.finalScore,
    finalSummary:
      patch.finalSummary !== undefined
        ? patch.finalSummary
        : current.finalSummary,
    runtimeUsed:
      patch.runtimeUsed !== undefined
        ? patch.runtimeUsed
        : current.runtimeUsed,
    cursorAgentId:
      patch.cursorAgentId !== undefined
        ? patch.cursorAgentId
        : current.cursorAgentId,
    userId: patch.userId !== undefined ? patch.userId : current.userId,
    interviewerPersona:
      patch.interviewerPersona !== undefined
        ? patch.interviewerPersona
        : current.interviewerPersona,
    updatedAt: new Date().toISOString(),
  };

  // Refresh fingerprint when context fields change
  if (
    patch.resumeText !== undefined ||
    patch.resumeId !== undefined ||
    patch.jdText !== undefined ||
    patch.jdUrl !== undefined ||
    patch.experienceNotes !== undefined
  ) {
    if (patch.contextFingerprint === undefined) {
      next.contextFingerprint = computeContextFingerprint({
        resumeId: next.resumeId,
        resumeText: next.resumeText,
        jdText: next.jdText,
        jdUrl: next.jdUrl,
        experienceNotes: next.experienceNotes,
      });
    }
  }

  getDb()
    .prepare(
      `UPDATE interviews SET
        name = ?, resume_id = ?, resume_text = ?, jd_text = ?, jd_url = ?,
        experience_notes = ?, context_fingerprint = ?, parent_interview_id = ?,
        runtime_preference = ?, status = ?, interviewer_role = ?,
        final_score = ?, final_summary = ?, runtime_used = ?,
        cursor_agent_id = ?, user_id = ?, interviewer_persona = ?, updated_at = ?
      WHERE id = ?`,
    )
    .run(
      next.name,
      next.resumeId,
      next.resumeText,
      next.jdText,
      next.jdUrl,
      next.experienceNotes,
      next.contextFingerprint,
      next.parentInterviewId,
      next.runtimePreference,
      next.status,
      next.interviewerRole,
      next.finalScore,
      next.finalSummary,
      next.runtimeUsed,
      next.cursorAgentId,
      next.userId,
      next.interviewerPersona,
      next.updatedAt,
      id,
    );
  return getInterview(id);
}

export function deleteInterview(id: string, userId?: string | null): boolean {
  const current = getInterview(id);
  if (!current) return false;
  if (userId && current.userId && current.userId !== userId) return false;

  const database = getDb();
  const tx = database.transaction(() => {
    // Re-parent children to this interview's parent (or null)
    database
      .prepare(
        `UPDATE interviews SET parent_interview_id = ?, updated_at = ?
         WHERE parent_interview_id = ?`,
      )
      .run(current.parentInterviewId, new Date().toISOString(), id);

    database.prepare(`DELETE FROM coach_asks WHERE interview_id = ?`).run(id);
    database.prepare(`DELETE FROM review_packs WHERE interview_id = ?`).run(id);
    database.prepare(`DELETE FROM turns WHERE interview_id = ?`).run(id);
    database.prepare(`DELETE FROM interviews WHERE id = ?`).run(id);
  });
  tx();
  return true;
}

export function listTurns(interviewId: string): Turn[] {
  return getDb()
    .prepare(
      "SELECT * FROM turns WHERE interview_id = ? ORDER BY sequence ASC",
    )
    .all(interviewId)
    .map((r) => mapTurn(r as Record<string, unknown>));
}

export function getTurn(id: string): Turn | null {
  const row = getDb().prepare("SELECT * FROM turns WHERE id = ?").get(id);
  return row ? mapTurn(row as Record<string, unknown>) : null;
}

export function createTurn(input: {
  interviewId: string;
  question: string;
  questionType?: QuestionType;
  codePrompt?: string | null;
}): Turn {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const max = getDb()
    .prepare(
      "SELECT COALESCE(MAX(sequence), 0) AS m FROM turns WHERE interview_id = ?",
    )
    .get(input.interviewId) as { m: number };
  const sequence = Number(max.m) + 1;
  getDb()
    .prepare(
      `INSERT INTO turns
      (id, interview_id, sequence, question, question_type, code_prompt, followups_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, '[]', ?)`,
    )
    .run(
      id,
      input.interviewId,
      sequence,
      input.question,
      input.questionType ?? "chat",
      input.codePrompt ?? null,
      createdAt,
    );
  updateInterview(input.interviewId, {});
  return getTurn(id)!;
}

export function updateTurn(
  id: string,
  patch: Partial<{
    answer: string;
    answerMode: AnswerMode;
    codeAnswer: string | null;
    evaluation: Evaluation | null;
    recommendedNext: string | null;
    followUps: FollowUp[];
  }>,
): Turn | null {
  const current = getTurn(id);
  if (!current) return null;
  const evaluation =
    patch.evaluation !== undefined ? patch.evaluation : current.evaluation;
  const followUps =
    patch.followUps !== undefined ? patch.followUps : current.followUps;
  const recommendedNext =
    patch.recommendedNext !== undefined
      ? patch.recommendedNext
      : current.recommendedNext;
  getDb()
    .prepare(
      `UPDATE turns SET
        answer = ?, answer_mode = ?, code_answer = ?,
        evaluation_json = ?, recommended_next = ?, followups_json = ?
      WHERE id = ?`,
    )
    .run(
      patch.answer !== undefined ? patch.answer : current.answer,
      patch.answerMode !== undefined ? patch.answerMode : current.answerMode,
      patch.codeAnswer !== undefined ? patch.codeAnswer : current.codeAnswer,
      evaluation ? JSON.stringify(evaluation) : null,
      recommendedNext,
      JSON.stringify(followUps),
      id,
    );
  updateInterview(current.interviewId, {});
  return getTurn(id);
}

export function getReviewPack(interviewId: string): ReviewPack | null {
  const row = getDb()
    .prepare("SELECT * FROM review_packs WHERE interview_id = ?")
    .get(interviewId);
  return row ? mapReviewPack(row as Record<string, unknown>) : null;
}

export function upsertReviewPack(input: {
  interviewId: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  followUpBank: FollowUp[];
  dimensionScores?: EvalDimensionScore[];
  nextPracticeTarget?: string | null;
}): ReviewPack {
  const existing = getReviewPack(input.interviewId);
  const id = existing?.id ?? randomUUID();
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO review_packs
      (id, interview_id, summary, strengths_json, gaps_json, followup_bank_json,
       dimensions_json, next_practice_target, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(interview_id) DO UPDATE SET
        summary = excluded.summary,
        strengths_json = excluded.strengths_json,
        gaps_json = excluded.gaps_json,
        followup_bank_json = excluded.followup_bank_json,
        dimensions_json = excluded.dimensions_json,
        next_practice_target = excluded.next_practice_target`,
    )
    .run(
      id,
      input.interviewId,
      input.summary,
      JSON.stringify(input.strengths),
      JSON.stringify(input.gaps),
      JSON.stringify(input.followUpBank),
      JSON.stringify(input.dimensionScores || []),
      input.nextPracticeTarget ?? null,
      createdAt,
    );
  return getReviewPack(input.interviewId)!;
}

export function getCoachAsk(input: {
  turnId: string;
  field: string;
  itemIndex: number | null;
}): CoachAsk | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM coach_asks
       WHERE turn_id = ? AND field = ?
         AND (
           (item_index IS NULL AND ? IS NULL)
           OR item_index = ?
         )
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(input.turnId, input.field, input.itemIndex, input.itemIndex);
  return row ? mapCoachAsk(row as Record<string, unknown>) : null;
}

export function upsertCoachAsk(input: {
  turnId: string;
  interviewId: string;
  field: "howToImprove" | "enterpriseImprovements";
  itemIndex: number | null;
  messages: CoachAskMessage[];
}): CoachAsk {
  const existing = getCoachAsk({
    turnId: input.turnId,
    field: input.field,
    itemIndex: input.itemIndex,
  });
  const id = existing?.id ?? randomUUID();
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  if (existing) {
    getDb()
      .prepare(`UPDATE coach_asks SET messages_json = ? WHERE id = ?`)
      .run(JSON.stringify(input.messages), id);
  } else {
    getDb()
      .prepare(
        `INSERT INTO coach_asks
        (id, turn_id, interview_id, field, item_index, messages_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.turnId,
        input.interviewId,
        input.field,
        input.itemIndex,
        JSON.stringify(input.messages),
        createdAt,
      );
  }
  return getCoachAsk({
    turnId: input.turnId,
    field: input.field,
    itemIndex: input.itemIndex,
  })!;
}

export function listCoachAsksForTurn(turnId: string): CoachAsk[] {
  return getDb()
    .prepare(
      "SELECT * FROM coach_asks WHERE turn_id = ? ORDER BY created_at ASC",
    )
    .all(turnId)
    .map((r) => mapCoachAsk(r as Record<string, unknown>));
}

export type AtsSessionStep =
  | "prepare"
  | "analyze"
  | "improve"
  | "builder"
  | "brand";

export type AtsSession = {
  id: string;
  userId: string;
  name: string;
  step: AtsSessionStep;
  resumeText: string;
  jdText: string;
  originalText: string;
  improvedText: string;
  jsonResumeJson: string | null;
  analysisJson: string | null;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapAtsSession(row: Record<string, unknown>): AtsSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    step: String(row.step || "prepare") as AtsSessionStep,
    resumeText: String(row.resume_text || ""),
    jdText: String(row.jd_text || ""),
    originalText: String(row.original_text || ""),
    improvedText: String(row.improved_text || ""),
    jsonResumeJson: row.json_resume_json ? String(row.json_resume_json) : null,
    analysisJson: row.analysis_json ? String(row.analysis_json) : null,
    templateId: row.template_id ? String(row.template_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listAtsSessions(userId: string): AtsSession[] {
  return getDb()
    .prepare(
      "SELECT * FROM ats_sessions WHERE user_id = ? ORDER BY updated_at DESC",
    )
    .all(userId)
    .map((r) => mapAtsSession(r as Record<string, unknown>));
}

export function getAtsSession(id: string): AtsSession | null {
  const row = getDb().prepare("SELECT * FROM ats_sessions WHERE id = ?").get(id);
  return row ? mapAtsSession(row as Record<string, unknown>) : null;
}

export function createAtsSession(input: {
  userId: string;
  name: string;
  step?: AtsSessionStep;
  resumeText?: string;
  jdText?: string;
  originalText?: string;
  improvedText?: string;
  jsonResumeJson?: string | null;
  analysisJson?: string | null;
  templateId?: string | null;
}): AtsSession {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO ats_sessions (
        id, user_id, name, step, resume_text, jd_text, original_text, improved_text,
        json_resume_json, analysis_json, template_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.userId,
      input.name,
      input.step || "prepare",
      input.resumeText || "",
      input.jdText || "",
      input.originalText || "",
      input.improvedText || "",
      input.jsonResumeJson ?? null,
      input.analysisJson ?? null,
      input.templateId ?? null,
      now,
      now,
    );
  return getAtsSession(id)!;
}

export function updateAtsSession(
  id: string,
  patch: Partial<{
    name: string;
    step: AtsSessionStep;
    resumeText: string;
    jdText: string;
    originalText: string;
    improvedText: string;
    jsonResumeJson: string | null;
    analysisJson: string | null;
    templateId: string | null;
  }>,
): AtsSession | null {
  const current = getAtsSession(id);
  if (!current) return null;
  const next = {
    name: patch.name ?? current.name,
    step: patch.step ?? current.step,
    resumeText: patch.resumeText ?? current.resumeText,
    jdText: patch.jdText ?? current.jdText,
    originalText: patch.originalText ?? current.originalText,
    improvedText: patch.improvedText ?? current.improvedText,
    jsonResumeJson:
      patch.jsonResumeJson !== undefined
        ? patch.jsonResumeJson
        : current.jsonResumeJson,
    analysisJson:
      patch.analysisJson !== undefined
        ? patch.analysisJson
        : current.analysisJson,
    templateId:
      patch.templateId !== undefined ? patch.templateId : current.templateId,
    updatedAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `UPDATE ats_sessions SET
        name = ?, step = ?, resume_text = ?, jd_text = ?, original_text = ?,
        improved_text = ?, json_resume_json = ?, analysis_json = ?,
        template_id = ?, updated_at = ?
      WHERE id = ?`,
    )
    .run(
      next.name,
      next.step,
      next.resumeText,
      next.jdText,
      next.originalText,
      next.improvedText,
      next.jsonResumeJson,
      next.analysisJson,
      next.templateId,
      next.updatedAt,
      id,
    );
  return getAtsSession(id);
}

export function deleteAtsSession(id: string, userId?: string): boolean {
  const current = getAtsSession(id);
  if (!current) return false;
  if (userId && current.userId !== userId) return false;
  getDb().prepare("DELETE FROM ats_sessions WHERE id = ?").run(id);
  return true;
}

/** Cascading erase of product data owned by a user (Play / privacy deletion). */
export function deleteAllUserOwnedData(userId: string): {
  interviews: number;
  resumes: number;
  atsSessions: number;
  recoveryJobs: number;
  memorySnapshots: number;
} {
  const database = getDb();
  return database.transaction(() => {
    const interviewIds = (
      database
        .prepare("SELECT id FROM interviews WHERE user_id = ?")
        .all(userId) as Array<{ id: string }>
    ).map((r) => r.id);
    for (const id of interviewIds) {
      database.prepare(`DELETE FROM coach_asks WHERE interview_id = ?`).run(id);
      database.prepare(`DELETE FROM review_packs WHERE interview_id = ?`).run(id);
      database.prepare(`DELETE FROM turns WHERE interview_id = ?`).run(id);
      database.prepare(`DELETE FROM interviews WHERE id = ?`).run(id);
    }
    const resumes = database
      .prepare("DELETE FROM resumes WHERE user_id = ?")
      .run(userId).changes;
    const atsSessions = database
      .prepare("DELETE FROM ats_sessions WHERE user_id = ?")
      .run(userId).changes;
    const recoveryJobs = database
      .prepare("DELETE FROM recovery_jobs WHERE user_id = ?")
      .run(userId).changes;
    const memorySnapshots = database
      .prepare("DELETE FROM memory_snapshots WHERE user_id = ?")
      .run(userId).changes;
    return {
      interviews: interviewIds.length,
      resumes,
      atsSessions,
      recoveryJobs,
      memorySnapshots,
    };
  })();
}
