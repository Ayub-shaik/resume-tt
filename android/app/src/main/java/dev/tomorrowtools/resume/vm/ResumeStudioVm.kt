package dev.tomorrowtools.resume.vm

import android.app.Application
import android.content.Context
import android.net.Uri
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
import dev.tomorrowtools.resume.util.parseScoreView
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

    fun saveSession(step: String = tab.name.lowercase()) = viewModelScope.launch {
        try {
            val res = api.writeSession(
                SessionWrite(
                    id = sessionId,
                    name = "Android session",
                    step = when (tab) {
                        ResumeTab.Prepare -> "prepare"
                        ResumeTab.Analyse, ResumeTab.Tailor -> "analyze"
                        ResumeTab.Brand -> "brand"
                        ResumeTab.Builder -> "builder"
                        ResumeTab.Profile -> step
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
        } catch (e: Exception) { error = e.message }
    }

    fun fetchJd() = launchBusy {
        val res = api.fetchJd(JdRequest(jdUrl.trim()))
        if (res.text.isNullOrBlank()) error = "Empty JD from URL — paste the description manually."
        else jdText = res.text
    }

    fun parseResumeUri(ctx: Context, uri: Uri) = launchBusy {
        val tmp = File(ctx.cacheDir, "upload-${System.currentTimeMillis()}")
        ctx.contentResolver.openInputStream(uri)?.use { input -> tmp.outputStream().use { input.copyTo(it) } }
            ?: error("Could not read file")
        val body = tmp.asRequestBody("application/octet-stream".toMediaType())
        val part = MultipartBody.Part.createFormData("file", tmp.name, body)
        val res = api.parseResume(part)
        if (res.text.isNullOrBlank()) error = "Could not extract text from file"
        else updateResume(res.text)
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
        if (originalText == null) {
            originalText = resumeText
            originalScores = scores
        }
        tab = ResumeTab.Analyse
        saveSession("analyze")
    }

    fun toggleMissing(kw: String) {
        queuedMissing = if (queuedMissing.contains(kw)) queuedMissing - kw else queuedMissing + kw
    }

    fun applySuggestion(s: RewriteSuggestion, replace: Boolean) {
        val payload = if (replace && s.current.isNotBlank()) s.suggested else s.suggested
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
        val jd = when (focus) {
            "ats" -> "Focus on ATS keyword coverage and section completeness.\n\n$jdText"
            "jd" -> "Focus on matching the job description responsibilities and required skills.\n\n$jdText"
            else -> "Balance ATS readability with JD keyword match.\n\n$jdText"
        }.let { base ->
            if (queuedMissing.isEmpty()) base
            else base + "\n\nPrioritize incorporating these missing keywords naturally: ${queuedMissing.joinToString(", ")}"
        }
        if (jdText.isBlank()) error("Job description required for tailor")
        val res = api.tailor(TailorRequest(resumeText, jd))
        val md = res.resumeMd ?: error("Empty tailor result")
        versions = (versions + VersionSnap("v${versions.size + 1}", md, focus)).takeLast(12)
        tailoredMd = md
        resumeText = md
        tab = ResumeTab.Tailor
        saveSession("improve")
        // refresh scores lightly via analyse optional — skip to save tokens unless user re-analyses
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
                    if (!resp.isSuccessful) error("Render failed: ${resp.code}")
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
                    if (!resp.isSuccessful) error("PDF failed: ${resp.code}")
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
            try { block() } catch (e: Exception) { error = e.message ?: e.toString() }
            finally { busy = false }
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
