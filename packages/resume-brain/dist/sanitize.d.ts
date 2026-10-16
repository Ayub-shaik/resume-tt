/** ATS-safe markdown sanitizer (shared brain). */
/** LLMs sometimes emit literal \\n instead of real newlines inside JSON strings. */
export declare function unescapeLiteralNewlines(text: string): string;
/** Collapse doubled words and partial-prefix duplicates (AWAWS → AWS, AyAyub → Ayub). */
export declare function fixDuplicatedFragments(text: string): string;
/** Insert missing spaces after sentence-ending punctuation. */
export declare function fixMissingSpaces(text: string): string;
export declare function normalizeProseMarkdown(md: string): string;
/** Cover letters need real paragraph breaks for PDF + copy/paste. */
export declare function normalizeCoverLetterMarkdown(md: string): string;
export declare function sanitizeAtsMarkdown(md: string): string;
//# sourceMappingURL=sanitize.d.ts.map