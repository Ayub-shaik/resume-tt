package dev.tomorrowtools.resume.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

@Serializable data class PasswordAuthRequest(val email: String, val password: String)
@Serializable data class MobileAuthRequest(val idToken: String)
@Serializable data class MobileUser(val id: String, val email: String, val name: String? = null, val image: String? = null, val role: String? = null)
@Serializable data class MobileAuthResponse(val token: String, val user: MobileUser)

@Serializable data class AnalyzeRequest(val resumeText: String, val jdText: String? = null)
@Serializable data class AnalyzePayload(val analysis: JsonElement? = null)
@Serializable data class TailorRequest(val resumeText: String, val jdText: String, val saveAsResume: Boolean? = true)
@Serializable data class TailorPayload(val resumeMd: String? = null, val filenameStub: String? = null)
@Serializable data class JdRequest(val url: String)
@Serializable data class JdPayload(val text: String? = null, val title: String? = null, val sourceUrl: String? = null)
@Serializable data class AskRequest(val question: String, val resumeText: String? = null, val jdText: String? = null, val context: String? = null)
@Serializable data class AskPayload(
    /** Web `/api/ats/ask` returns `reply`. */
    val reply: String? = null,
    val answer: String? = null,
    val text: String? = null,
)
@Serializable data class BrandRequest(val resumeText: String, val linkedinText: String? = null, val targetRole: String? = null)
@Serializable data class BrandChecklistItem(val id: String, val label: String, val ok: Boolean, val tip: String)
@Serializable data class BrandKeywords(val present: List<String> = emptyList(), val missing: List<String> = emptyList())
@Serializable data class CareerBrandKit(
    val score: Int = 0,
    val positioning: String = "",
    val headlines: List<String> = emptyList(),
    val about: String = "",
    val experienceTips: List<String> = emptyList(),
    val checklist: List<BrandChecklistItem> = emptyList(),
    val keywords: BrandKeywords = BrandKeywords(),
    val niche: String = "",
)
@Serializable data class BrandPayload(val kit: CareerBrandKit)
@Serializable data class TemplateMeta(val id: String, val name: String, val blurb: String? = null, val category: String? = null, val accent: String? = null)
@Serializable data class TemplatesPayload(val templates: List<TemplateMeta> = emptyList())
@Serializable data class ImproveRequest(
    val action: String = "pass",
    val masterResume: String,
    val currentResume: String? = null,
    val jdText: String? = null,
    val focus: String? = null,
    val matchScore: Int? = null,
    val currentVersion: Int? = null,
)
@Serializable data class ImprovePass(
    val version: Int? = null,
    val resumeMd: String? = null,
    val saturated: Boolean? = null,
    val notes: List<String>? = null,
)
@Serializable data class ImprovePayload(val pass: ImprovePass? = null, val error: String? = null)
@Serializable data class StructureRequest(
    val action: String = "structure",
    val resumeText: String? = null,
    val jdText: String? = null,
    val instruction: String? = null,
    val jsonResume: JsonElement? = null,
    val saveAsResume: Boolean? = false,
)
@Serializable data class StructurePayload(val jsonResume: JsonObject? = null, val resumeText: String? = null, val resumeMd: String? = null)
@Serializable data class ResumeRow(val id: String, val name: String? = null, val content: String? = null, val createdAt: String? = null)
@Serializable data class ResumesPayload(val resumes: List<ResumeRow> = emptyList())
@Serializable data class SessionRow(
    val id: String,
    val name: String? = null,
    val step: String? = null,
    val resumeText: String? = null,
    val jdText: String? = null,
    val originalText: String? = null,
    val improvedText: String? = null,
    val templateId: String? = null,
    val analysis: JsonElement? = null,
    /** Server list/get sessions return analysisJson (stringified), not analysis. */
    val analysisJson: String? = null,
)
@Serializable data class SessionsPayload(val sessions: List<SessionRow> = emptyList())
@Serializable data class SessionPayload(val session: SessionRow)
@Serializable data class SessionWrite(
    val id: String? = null,
    val name: String? = null,
    val step: String? = null,
    val resumeText: String? = null,
    val jdText: String? = null,
    val originalText: String? = null,
    val improvedText: String? = null,
    val analysis: JsonElement? = null,
    val templateId: String? = null,
    val delete: Boolean? = null,
)
@Serializable data class ParseTextPayload(val text: String? = null)
@Serializable data class VersionSnap(
    val label: String,
    val text: String,
    val focus: String,
    val overall: Int? = null,
    val ats: Int? = null,
    val keyword: Int? = null,
)

data class DimensionView(
    val id: String,
    val label: String,
    val score: Int?,
    val note: String?,
)

data class SectionView(
    val name: String,
    val score: Int?,
    val notes: String?,
)

data class RewriteSuggestion(
    val area: String,
    val current: String = "",
    val suggested: String,
    val why: String = "",
    val kind: String = "",
)

data class ScoreView(
    val overall: Int?,
    val ats: Int?,
    val keyword: Int?,
    val strengths: List<String>,
    val gaps: List<String>,
    val missing: List<String>,
    val matched: List<String>,
    val suggestions: List<RewriteSuggestion>,
    val skim: List<String>,
    val dimensions: List<DimensionView>,
    val sections: List<SectionView>,
)
