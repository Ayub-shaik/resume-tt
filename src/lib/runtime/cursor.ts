import { Agent, CursorAgentError } from "@cursor/sdk";
import type { ChatMessage, RuntimeResult } from "./types";

export async function runCursor(
  messages: ChatMessage[],
  opts?: { agentId?: string | null },
): Promise<RuntimeResult> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is not set");
  }

  const modelId = process.env.CURSOR_MODEL || "composer-2.5";
  const prompt = messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join("\n\n");

  try {
    if (opts?.agentId) {
      await using agent = await Agent.resume(opts.agentId, { apiKey });
      const run = await agent.send(prompt);
      const result = await run.wait();
      if (result.status === "error") {
        throw new Error(`Cursor run failed: ${result.id}`);
      }
      return {
        text: result.result ?? "",
        runtime: "cursor",
        cursorAgentId: opts.agentId,
      };
    }

    await using agent = await Agent.create({
      apiKey,
      model: { id: modelId },
      local: { cwd: process.cwd() },
    });
    const run = await agent.send(prompt);
    const result = await run.wait();
    if (result.status === "error") {
      throw new Error(`Cursor run failed: ${result.id}`);
    }
    return {
      text: result.result ?? "",
      runtime: "cursor",
      cursorAgentId: agent.agentId,
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Cursor startup failed: ${err.message}`);
    }
    throw err;
  }
}
