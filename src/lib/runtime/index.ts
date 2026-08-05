import { runCursor } from "./cursor";
import { runOpenClaw } from "./openclaw";
import { interviewOpenClawSession } from "./sessionKey";
import {
  parseInterviewerPayload,
  resolvePreferredRuntime,
  type ChatMessage,
  type RuntimeResult,
} from "./types";
import type { InterviewerPayload, RuntimePreference } from "../types";

export async function runInterviewModel(input: {
  messages: ChatMessage[];
  interviewId: string;
  cursorAgentId?: string | null;
  runtimePreference?: RuntimePreference | null;
  /** Optional turn id — keeps session keys unique under concurrent users */
  turnId?: string | null;
}): Promise<{
  payload: InterviewerPayload;
  runtime: RuntimeResult["runtime"];
  cursorAgentId?: string;
  raw: string;
}> {
  const preferred = resolvePreferredRuntime(input.runtimePreference);
  const errors: string[] = [];
  const sessionKey = interviewOpenClawSession(
    input.interviewId,
    input.turnId || undefined,
  );

  const tryCursor = async () => {
    const result = await runCursor(input.messages, {
      agentId: input.cursorAgentId,
    });
    return {
      payload: parseInterviewerPayload(result.text),
      runtime: result.runtime,
      cursorAgentId: result.cursorAgentId,
      raw: result.text,
    };
  };

  const tryOpenClaw = async () => {
    const result = await runOpenClaw(input.messages, { sessionKey });
    return {
      payload: parseInterviewerPayload(result.text),
      runtime: result.runtime,
      raw: result.text,
    };
  };

  const pref = input.runtimePreference || "auto";

  // Forced single runtime: fail loud, no silent cross-fallback
  if (pref === "cursor") {
    try {
      return await tryCursor();
    } catch (err) {
      throw new Error(
        `Cursor runtime failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  if (pref === "openclaw") {
    try {
      return await tryOpenClaw();
    } catch (err) {
      throw new Error(
        `OpenClaw runtime failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // auto: prefer resolved, fallback to the other
  if (preferred === "cursor") {
    try {
      return await tryCursor();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      try {
        return await tryOpenClaw();
      } catch (err2) {
        errors.push(err2 instanceof Error ? err2.message : String(err2));
        throw new Error(`All runtimes failed:\n- ${errors.join("\n- ")}`);
      }
    }
  }

  try {
    return await tryOpenClaw();
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    if (process.env.CURSOR_API_KEY?.trim()) {
      try {
        return await tryCursor();
      } catch (err2) {
        errors.push(err2 instanceof Error ? err2.message : String(err2));
      }
    }
    throw new Error(`All runtimes failed:\n- ${errors.join("\n- ")}`);
  }
}

export { resolvePreferredRuntime };
