import type { Interview, Resume } from "@/lib/types";

/** True if row is owned by user, or legacy null-owner (claimed on first touch). */
export function canAccess(
  row: { userId?: string | null },
  userId: string,
): boolean {
  return !row.userId || row.userId === userId;
}

export function assertInterviewAccess(
  interview: Interview | null,
  userId: string,
): interview is Interview {
  return Boolean(interview && canAccess(interview, userId));
}

export function assertResumeAccess(
  resume: Resume | null,
  userId: string,
): resume is Resume {
  return Boolean(resume && canAccess(resume, userId));
}
