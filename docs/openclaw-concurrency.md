# OpenClaw concurrency (MPI)

## Why two machines crashed
OpenClaw runs parallel work **per distinct session key**, then caps global
parallelism with `agents.defaults.maxConcurrent`.

MPI used to send **shared keys** (`ats-analyze-<userId>`, raw `interviewId`).
Two in-flight calls with the same key collide / serialize badly. Ten users on
one key-family stampede the gateway.

## What we do now
- Every OpenClaw call gets an **ephemeral** key: `mpi:<kind>:<ids>:<uuid>`
  (`src/lib/runtime/sessionKey.ts`). Full prompt context is already in the
  messages, so sticky sessions are not required for JSON turns.
- Transient `429/502/503/504` are retried with backoff (no global app queue).
- Gateway: set `agents.defaults.maxConcurrent` (this host → **8**). Restart
  OpenClaw gateway after changing `~/.openclaw/openclaw.json`.

## Scaling further
- More CPU/RAM for the gateway process, or a second gateway + load balance.
- Cursor runtime fallback when OpenClaw is saturated (`AI_RUNTIME=auto`).
- Multi-node MPI still needs shared rate limits (Redis) later — session keys
  alone fix cross-user isolation on one gateway.
