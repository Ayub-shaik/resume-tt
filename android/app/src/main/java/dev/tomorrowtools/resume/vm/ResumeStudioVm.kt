package dev.tomorrowtools.resume.vm

import android.app.Application
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import dev.tomorrowtools.resume.BuildConfig
import dev.tomorrowtools.resume.SessionStore
import dev.tomorrowtools.resume.appJson
import dev.tomorrowtools.resume.buildOkHttp
import dev.tomorrowtools.resume.buildRetrofit
import dev.tomorrowtools.resume.data.*
import dev.tomorrowtools.resume.startGoogleBrowserLogin
import dev.tomorrowtools.resume.util.assessResumeInput
import dev.tomorrowtools.resume.util.isDestructiveSuggestion
import dev.tomorrowtools.resume.util.parseExtensionAllowed
import dev.tomorrowtools.resume.util.parseScoreView
import dev.tomorrowtools.resume.util.toUserMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

enum class ResumeTab { Prepare, Analyse, Tailor, Brand, Builder, Profile }

class ResumeStudioVm(app: Application) : AndroidViewModel(app) {
    private val store = SessionStore(app)
    private var token: String? = null
    private val http = buildOkHttp { token }
    private val api = buildRetrofit(BuildConfig.API_BASE_URL, http).create(ResumeApi::class.java)

    var email by mutableStateOf<String?>(null); private set
    var busy by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set
    var gateWarning by mutableStateOf<String?>(null); private set
    var tab by mutableStateOf(ResumeTab.Prepare); private set
    /** True after Tailor until user re-scores — gauges are pre-improve. */
    var scoresArePreImprove by mutableStateOf(false); private set

    var emailInput by mutableStateOf(""); private set
    var passwordInput by mutableStateOf(""); private set
    var resumeText by mutableStateOf(""); private set
    var jdText by mutableStateOf(""); private set
    var jdUrl by mutableStateOf(""); private set
    var focus by mutableStateOf("balanced"); private set

    var analysisRaw by mutableStateOf<JsonElement?>(null); private set
    var scores by mutableStateOf(
        ScoreView(
            null, null, null, emptyList(), emptyList(), emptyList(), emptyList(),
            emptyList(), emptyList(), emptyList(), emptyList(),
        ),
    ); private set
    var originalText by mutableStateOf<String?>(null); private set
    var originalScores by mutableStateOf<ScoreView?>(null); private set
    var queuedMissing by mutableStateOf<List<String>>(emptyList()); private set
    var askQuestion by mutableStateOf(""); private set
    var askAnswer by mutableStateOf<String?>(null); private set

    var tailoredMd by mutableStateOf<String?>(null); private set
    var versions by mutableStateOf<List<VersionSnap>>(emptyList()); private set

    var brandKit by mutableStateOf<CareerBrandKit?>(null); private set
    var linkedinPaste by mutableStateOf(""); private set
    var targetRole by mutableStateOf(""); private set

    var templates by mutableStateOf<List<TemplateMeta>>(emptyList()); private set
    var selectedTemplate by mutableStateOf("classic"); private set
    var jsonResume by mutableStateOf<JsonObject?>(null); private set
    var pdfPath by mutableStateOf<String?>(null); private set

    var resumes by mutableStateOf<List<ResumeRow>>(emptyList()); private set
    var sessions by mutableStateOf<List<SessionRow>>(emptyList()); private set
    var sessionId by mutableStateOf<String?>(null); private set

    init {
        viewModelScope.launch {
            token = store.token.first()
            email = store.email.first()
            if (token != null) {
                refreshProfile()
                restoreLatestSession()
            }
        }
    }

    fun updateEmailInput(v: String) { emailInput = v }
    fun updatePasswordInput(v: String) { passwordInput = v }
    fun updateResume(v: String) {
        resumeText = v
        if (originalText != null && v != originalText) {
            originalText = null
            originalScores = null
        }
    }
    fun updateJd(v: String) { jdText = v }
    fun updateJdUrl(v: String) { jdUrl = v }
    fun updateFocus(v: String) { focus = v }
    fun selectTab(t: ResumeTab) { tab = t }
    fun updateAsk(v: String) { askQuestion = v }
    fun updateLinkedin(v: String) { linkedinPaste = v }
    fun updateTargetRole(v: String) { targetRole = v }
    fun selectTemplate(id: String) { selectedTemplate = id }

    fun clearStudioState() {
        resumeText = ""; jdText = ""; jdUrl = ""
        analysisRaw = null
        scores = ScoreView(
            null, null, null, emptyList(), emptyList(), emptyList(), emptyList(),
            emptyList(), emptyList(), emptyList(), emptyList(),
        )
        originalText = null; originalScores = null
        queuedMissing = emptyList(); askAnswer = null; askQuestion = ""
        tailoredMd = null; versions = emptyList()
        brandKit = null; linkedinPaste = ""; targetRole = ""
        jsonResume = null; pdfPath = null; sessionId = null
        gateWarning = null; error = null
        scoresArePreImprove = false
        tab = ResumeTab.Prepare
    }

    fun signInWithPassword() = launchBusy {
        val res = api.passwordAuth(PasswordAuthRequest(emailInput.trim(), passwordInput))
        token = res.token
        store.save(res.token, res.user.email)
        email = res.user.email
        clearStudioState()
        refreshProfile(); restoreLatestSession()
    }

    fun applyOAuthToken(tok: String, em: String?) = viewModelScope.launch {
        token = tok
        store.save(tok, em.orEmpty())
        email = em
        clearStudioState()
        refreshProfile(); restoreLatestSession()
    }

    fun startGoogleBrowser(ctx: Context) {
        error = null
        startGoogleBrowserLogin(ctx)
    }

    fun signOut() = viewModelScope.launch {
        store.clear(); token = null; email = null
        clearStudioState(); resumes = emptyList(); sessions = emptyList()
    }

    fun refreshProfile() = viewModelScope.launch {
        try {
            resumes = api.listResumes().resumes
            sessions = api.listSessions().sessions
        } catch (e: Exception) { error = e.message }
    }

    private suspend fun restoreLatestSession() {
        try {
            val list = api.listSessions().sessions
            sessions = list
            val s = list.firstOrNull() ?: return
            applySession(s)
        } catch (_: Exception) {}
    }

    fun loadSession(id: String) = launchBusy {
        val s = api.getSession(id).session
        applySession(s)
    }

    private fun applySession(s: SessionRow) {
        sessionId = s.id
        resumeText = s.resumeText.orEmpty()
        jdText = s.jdText.orEmpty()
        originalText = s.originalText
        tailoredMd = s.improvedText
        if (!s.improvedText.isNullOrBlank()) resumeText = s.improvedText
        analysisRaw = s.analysis
        scores = parseScoreView(s.analysis)
        selectedTemplate = s.templateId ?: "classic"
        tab = when (s.step) {
            "analyze", "improve" -> ResumeTab.Analyse
            "brand" -> ResumeTab.Brand
            "builder" -> ResumeTab.Builder
            else -> ResumeTab.Prepare
        }
    }

    private suspend fun persistSession(stepHint: String? = null) {
        val res = api.writeSession(
            SessionWrite(
                id = sessionId,
                name = "Android session",
                step = when (tab) {
                    ResumeTab.Prepare -> "prepare"
                    ResumeTab.Analyse, ResumeTab.Tailor -> stepHint ?: "analyze"
                    ResumeTab.Brand -> "brand"
                    ResumeTab.Builder -> "builder"
                    ResumeTab.Profile -> stepHint ?: "prepare"
                },
                resumeText = resumeText,
                jdText = jdText,
                originalText = originalText,
                improvedText = tailoredMd,
                analysis = analysisRaw,
                templateId = selectedTemplate,
            ),
        )
        sessionId = res.session.id
        sessions = api.listSessions().sessions
    }

    fun saveSession(step: String = tab.name.lowercase()) = viewModelScope.launch {
        try {
            persistSession(step)
        } catch (e: Exception) {
            error = e.toUserMessage()
        }
    }

    fun fetchJd() = launchBusy {
        val res = api.fetchJd(JdRequest(jdUrl.trim()))
        if (res.text.isNullOrBlank()) error = "Empty JD from URL — paste the description manually."
        else jdText = res.text
    }

    fun parseResumeUri(ctx: Context, uri: Uri) = launchBusy {
        val resolver = ctx.contentResolver
        var displayName = "resume.pdf"
        resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) {
                val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) displayName = c.getString(idx) ?: displayName
            }
        }
        val mime = resolver.getType(uri)
            ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(
                displayName.substringAfterLast('.', "").lowercase(),
            )
            ?: "application/octet-stream"
        val ext = displayName.substringAfterLast('.', "").ifBlank {
            MimeTypeMap.getSingleton().getExtensionFromMimeType(mime) ?: "bin"
        }
        val safeName = if (displayName.contains('.')) displayName
        else "resume.$ext"
        if (!parseExtensionAllowed(safeName)) {
            error(
                "Unsupported type .$ext — use txt, md, pdf, doc, docx, docm, rtf, odt, pptx, ppt, xlsx, xls, csv, or epub",
            )
        }
        val tmp = File(ctx.cacheDir, "upload-${System.currentTimeMillis()}-$safeName")
        resolver.openInputStream(uri)?.use { input -> tmp.outputStream().use { input.copyTo(it) } }
            ?: error("Could not read file")
        val mediaType = try {
            mime.toMediaType()
        } catch (_: Exception) {
            "application/octet-stream".toMediaType()
        }
        // Server Firecrawl AnyDoc — keep multipart filename + MIME (never embed AnyDoc on device)
        val body = tmp.asRequestBody(mediaType)
        val part = MultipartBody.Part.createFormData("file", safeName, body)
        val res = api.parseResume(part)
        if (res.text.isNullOrBlank()) {
            error = "Could not extract text from file (scanned PDFs need OCR and may fail server-side)"
        } else {
            updateResume(res.text)
        }
        tmp.delete()
    }

    fun analyse() = launchBusy {
        val gate = assessResumeInput(resumeText)
        gateWarning = gate.warning
        if (gate.block) {
            error = gate.blockMessage
            return@launchBusy
        }
        val res = api.analyze(AnalyzeRequest(resumeText, jdText.ifBlank { null }))
        analysisRaw = res.analysis
        scores = parseScoreView(res.analysis)
        scoresArePreImprove = false
        if (originalText == null) {
            originalText = resumeText
            originalScores = scores
        }
        tab = ResumeTab.Analyse
        // Session save must not fail the Analyse path
        viewModelScope.launch {
            try {
                persistSession("analyze")
            } catch (_: Exception) {
            }
        }
    }

    fun toggleMissing(kw: String) {
        queuedMissing = if (queuedMissing.contains(kw)) queuedMissing - kw else queuedMissing + kw
    }

    fun applySuggestion(s: RewriteSuggestion, replace: Boolean) {
        val payload = s.suggested
        if (isDestructiveSuggestion(payload) || isDestructiveSuggestion(s.why)) {
            error = "Skipped destructive contact-removal suggestion."
            return
        }
        if (replace && s.current.isNotBlank() && resumeText.contains(s.current)) {
            resumeText = resumeText.replace(s.current, s.suggested)
        } else {
            resumeText = (resumeText.trimEnd() + "\n\n" + s.suggested).trim()
        }
        originalText = null; originalScores = null
        scoresArePreImprove = true
    }

    fun applyAllSuggestions() {
        val list = scores.suggestions.filterNot {
            isDestructiveSuggestion(it.suggested) || isDestructiveSuggestion(it.why)
        }
        if (list.isEmpty()) {
            error = "No non-destructive suggestions to apply"
            return
        }
        list.forEach { s ->
            applySuggestion(s, replace = s.current.isNotBlank() && resumeText.contains(s.current))
        }
    }

    fun tailorSuggestion(s: RewriteSuggestion) {
        if (s.suggested.isNotBlank() && !queuedMissing.contains(s.area)) {
            // Prefer incorporating the suggested wording via tailor focus on JD + suggestion
            queuedMissing = (queuedMissing + s.suggested.split(Regex("\\s+"))
                .filter { it.length in 3..28 && it.any(Char::isLetter) }
                .take(4)).distinct().take(12)
        }
        selectTab(ResumeTab.Tailor)
        if (jdText.isNotBlank()) tailor()
        else error = "Add a job description, then Improve"
    }

    fun accommodateMissing() {
        if (queuedMissing.isEmpty()) {
            error = "Tap missing keyword chips first"
            return
        }
        selectTab(ResumeTab.Tailor)
        tailor()
    }

    fun askAts() = launchBusy {
        val res = api.ask(AskRequest(askQuestion, resumeText, jdText))
        askAnswer = res.answer ?: res.text ?: res.toString()
    }

    fun tailor() = launchBusy {
        if (jdText.isBlank()) error("Job description required for tailor")
        // Keep jdText as the JD body the API expects; put focus/missing as prefix context in jdText
        // only when needed — server requires resumeText + jdText (route: POST api/ats/tailor).
        val jdPayload = buildString {
            when (focus) {
                "ats" -> appendLine("Focus: ATS keyword coverage and section completeness.")
                "jd" -> appendLine("Focus: match JD responsibilities and required skills.")
                else -> appendLine("Focus: balance ATS readability with JD keyword match.")
            }
            if (queuedMissing.isNotEmpty()) {
                appendLine("Prioritize incorporating: ${queuedMissing.joinToString(", ")}")
            }
            appendLine()
            append(jdText)
        }
        val res = api.tailor(TailorRequest(resumeText = resumeText, jdText = jdPayload, saveAsResume = true))
        val md = res.resumeMd?.takeIf { it.isNotBlank() } ?: error("Empty tailor result")
        versions = (versions + VersionSnap("v${versions.size + 1}", md, focus)).takeLast(12)
        tailoredMd = md
        resumeText = md
        scoresArePreImprove = true
        tab = ResumeTab.Tailor
        viewModelScope.launch {
            try {
                persistSession("improve")
            } catch (_: Exception) {
            }
        }
    }

    fun restoreVersion(snap: VersionSnap) {
        resumeText = snap.text
        tailoredMd = snap.text
        focus = snap.focus
    }

    fun loadBrand() = launchBusy {
        brandKit = api.careerBrand(BrandRequest(resumeText, linkedinPaste.ifBlank { null }, targetRole.ifBlank { null })).kit
        tab = ResumeTab.Brand
        saveSession("brand")
    }

    fun loadTemplates() = viewModelScope.launch {
        try { templates = api.templates().templates } catch (e: Exception) { error = e.message }
    }

    fun structureForBuilder() = launchBusy {
        val res = api.structure(StructureRequest(action = "structure", resumeText = resumeText, jdText = jdText.ifBlank { null }))
        jsonResume = res.jsonResume
        if (templates.isEmpty()) templates = api.templates().templates
        tab = ResumeTab.Builder
        saveSession("builder")
    }

    fun exportPdf(ctx: Context) = launchBusy {
        val md = tailoredMd ?: resumeText
        if (jsonResume != null) {
            // prefer template render when structured
            val bodyJson = """{"template":"$selectedTemplate","resume":${jsonResume},"format":"pdf"}"""
            val req = Request.Builder()
                .url(BuildConfig.API_BASE_URL.trimEnd('/') + "/api/ats/render")
                .header("Authorization", "Bearer ${token.orEmpty()}")
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .build()
            val bytes = withContext(Dispatchers.IO) {
                http.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        val err = resp.body?.string()?.take(280)
                        error("Render HTTP ${resp.code}${err?.let { ": $it" } ?: ""}")
                    }
                    resp.body?.bytes() ?: error("Empty PDF")
                }
            }
            val file = File(ctx.cacheDir, "resume-${selectedTemplate}.pdf")
            file.writeBytes(bytes)
            pdfPath = file.absolutePath
        } else {
            val bodyJson = appJson.encodeToString(PdfBody(md, "ATS_Resume"))
            val req = Request.Builder()
                .url(BuildConfig.API_BASE_URL.trimEnd('/') + "/api/ats/pdf")
                .header("Authorization", "Bearer ${token.orEmpty()}")
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .build()
            val bytes = withContext(Dispatchers.IO) {
                http.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        val err = resp.body?.string()?.take(280)
                        error("PDF HTTP ${resp.code}${err?.let { ": $it" } ?: ""}")
                    }
                    resp.body?.bytes() ?: error("Empty PDF")
                }
            }
            val file = File(ctx.cacheDir, "ats_resume.pdf")
            file.writeBytes(bytes)
            pdfPath = file.absolutePath
        }
    }

    fun useSavedResume(r: ResumeRow) {
        r.content?.let { updateResume(it) }
        tab = ResumeTab.Prepare
    }

    private fun launchBusy(block: suspend () -> Unit) {
        viewModelScope.launch {
            busy = true; error = null
            try {
                block()
            } catch (e: Exception) {
                error = e.toUserMessage()
            } finally {
                busy = false
            }
        }
    }

    companion object {
        fun factory(app: Application) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = ResumeStudioVm(app) as T
        }
    }
}

@kotlinx.serialization.Serializable
private data class PdfBody(val markdown: String, val title: String? = null)
