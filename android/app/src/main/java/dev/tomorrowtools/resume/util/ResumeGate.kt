package dev.tomorrowtools.resume.util

data class ResumeGateResult(
    val wordCount: Int,
    val hasSectionSignal: Boolean,
    val looksGibberish: Boolean,
    val block: Boolean,
    val blockMessage: String?,
    val warning: String?,
)

private val SECTION_RE =
    Regex("""\b(education|summary|objective|experience|work\s*history|employment|skills|projects|certifications?|achievements?|profile)\b""", RegexOption.IGNORE_CASE)
private val GIBBERISH_RE =
    Regex("""^(.)\1{3,}$|^(asdf+|qwer+|zxcv+|hjkl+|gggg+|xxxx+|test+|lorem|ipsum|dummy|blah|foo|bar)+$""", RegexOption.IGNORE_CASE)
private val COVER_LETTER_RE =
    Regex(
        """\b(dear\s+(hiring|sir|madam|recruiter)|cover\s*letter|i\s+am\s+writing\s+to\s+(apply|express)|to\s+whom\s+it\s+may\s+concern|please\s+find\s+(my|attached)\s+resume)\b""",
        RegexOption.IGNORE_CASE,
    )

fun countWords(text: String): Int =
    text.trim().split(Regex("""\s+""")).count { it.any(Char::isLetterOrDigit) }

fun assessResumeInput(raw: String): ResumeGateResult {
    val text = raw.trim()
    val wordCount = countWords(text)
    val hasSectionSignal = SECTION_RE.containsMatchIn(text)
    val letters = text.count { it.isLetter() }
    val letterRatio = if (text.isEmpty()) 0.0 else letters.toDouble() / text.length
    val compact = text.replace(Regex("""\s+"""), "")
    val looksGibberish =
        text.isEmpty() ||
            GIBBERISH_RE.containsMatchIn(compact) ||
            (wordCount <= 3 && text.length < 40) ||
            (wordCount < 12 && letterRatio < 0.45) ||
            (wordCount < 8 && !hasSectionSignal && Regex("""^[a-z\s]{1,40}$""", RegexOption.IGNORE_CASE).matches(text))
    val looksLikeCoverLetter =
        COVER_LETTER_RE.containsMatchIn(text) &&
            !hasSectionSignal &&
            !Regex("""\b(experience|education|skills|employment)\b""", RegexOption.IGNORE_CASE).containsMatchIn(text)
    if (looksLikeCoverLetter) {
        return ResumeGateResult(
            wordCount, hasSectionSignal, false, true,
            "This looks like a cover letter or prose, not a resume. Upload a resume or enter professional data (Experience, Skills, Education) to score and improve.",
            "Cover letters are not scored as resumes — paste a resume instead.",
        )
    }
    val tooThin = wordCount < 40 || (wordCount < 120 && !hasSectionSignal)
    if (text.isEmpty() || tooThin) {
        return ResumeGateResult(
            wordCount, hasSectionSignal, looksGibberish, true,
            "Please check your resume — there is less data to start from. Aim for ~150+ words with sections like Summary, Experience or Education, and Skills.",
            if (looksGibberish) "The resume text looks like placeholder or gibberish." else null,
        )
    }
    if (looksGibberish) {
        return ResumeGateResult(
            wordCount, hasSectionSignal, true, false, null,
            "This resume text looks like gibberish or placeholder content. Analysis will continue, but results may not be useful.",
        )
    }
    return ResumeGateResult(wordCount, hasSectionSignal, false, false, null, null)
}

fun isDestructiveSuggestion(text: String): Boolean {
    val t = text.lowercase()
    return Regex("""\b(remove|delete|strip|drop)\b.*\b(address|phone|email|location|contact|linkedin)\b""").containsMatchIn(t)
}
