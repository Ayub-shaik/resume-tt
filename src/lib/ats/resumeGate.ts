/** Fast client-side resume checks before spending model tokens. */

const SECTION_RE =
  /\b(education|summary|objective|experience|work\s*history|employment|skills|projects|certifications?|achievements?|profile)\b/i;

const GIBBERISH_RE =
  /^(.)\1{3,}$|^(asdf+|qwer+|zxcv+|hjkl+|gggg+|xxxx+|test+|lorem|ipsum|dummy|blah|foo|bar)+$/i;

export type ResumeGateResult = {
  wordCount: number;
  hasSectionSignal: boolean;
  looksGibberish: boolean;
  /** Block analyse — too little real content. */
  block: boolean;
  blockMessage: string | null;
  /** Soft warning — still allow analyse. */
  warning: string | null;
};

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => /[a-zA-Z0-9]/.test(w)).length;
}

export function assessResumeInput(raw: string): ResumeGateResult {
  const text = raw.trim();
  const wordCount = countWords(text);
  const hasSectionSignal = SECTION_RE.test(text);
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = text.length ? letters / text.length : 0;

  const looksGibberish =
    !text ||
    GIBBERISH_RE.test(text.replace(/\s+/g, "")) ||
    (wordCount <= 3 && text.length < 40) ||
    (wordCount < 12 && letterRatio < 0.45) ||
    (wordCount < 8 && !hasSectionSignal && /^[a-z\s]{1,40}$/i.test(text));

  // Half-page resume ≈ 150 words; allow shorter if section headings present
  const tooThin =
    wordCount < 40 || (wordCount < 120 && !hasSectionSignal);

  if (!text || tooThin) {
    return {
      wordCount,
      hasSectionSignal,
      looksGibberish,
      block: true,
      blockMessage:
        "Please check your resume — there is less data to start from. Aim for ~150+ words with sections like Summary, Experience or Education, and Skills.",
      warning: looksGibberish
        ? "The resume text looks like placeholder or gibberish."
        : null,
    };
  }

  if (looksGibberish) {
    return {
      wordCount,
      hasSectionSignal,
      looksGibberish: true,
      block: false,
      blockMessage: null,
      warning:
        "This resume text looks like gibberish or placeholder content. Analysis will continue, but results may not be useful.",
    };
  }

  return {
    wordCount,
    hasSectionSignal,
    looksGibberish: false,
    block: false,
    blockMessage: null,
    warning: null,
  };
}
