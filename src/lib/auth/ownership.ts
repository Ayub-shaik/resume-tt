import type { Interview, Resume } from "@/lib/types";

/** True only if the row is owned by this user. Legacy null-owner rows are not readable by anyone. */
export function canAccess(
  row: { userId?: string | null },
  userId: string,
): boolean {
  return Boolean(row.userId) && row.userId === userId;
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
