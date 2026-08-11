package dev.tomorrowtools.resume.ui

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.FactCheck
import androidx.compose.material.icons.filled.AutoFixHigh
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import dev.tomorrowtools.resume.BuildConfig
import dev.tomorrowtools.resume.data.RewriteSuggestion
import dev.tomorrowtools.resume.util.PARSE_MIME_TYPES
import dev.tomorrowtools.resume.util.openSiblingOrWeb
import dev.tomorrowtools.resume.vm.ResumeStudioVm
import dev.tomorrowtools.resume.vm.ResumeTab
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudioScreen(vm: ResumeStudioVm) {
    val ctx = LocalContext.current
    var moreOpen by remember { mutableStateOf(false) }
    var hideMpiPrompt by remember { mutableStateOf(false) }
    val canOpenMpi = vm.analysisRaw != null
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Resume ATS") },
                actions = {
                    if (canOpenMpi) {
                        TextButton(onClick = { openMpiWithResumeContext(ctx, vm) }, enabled = !vm.busy) { Text("MPI") }
                    }
                    TextButton(onClick = { vm.selectTab(ResumeTab.Builder) }, enabled = !vm.busy) { Text("Templates") }
                    TextButton(onClick = { moreOpen = true }, enabled = !vm.busy) { Text("More") }
                    DropdownMenu(expanded = moreOpen, onDismissRequest = { moreOpen = false }) {
                        DropdownMenuItem(
                            text = { Text("Career Brand") },
                            onClick = { moreOpen = false; vm.selectTab(ResumeTab.Brand) },
                        )
                        DropdownMenuItem(
                            text = { Text("Templates / PDF") },
                            onClick = { moreOpen = false; vm.selectTab(ResumeTab.Builder) },
                        )
                        DropdownMenuItem(
                            text = { Text("Profile / sessions") },
                            onClick = { moreOpen = false; vm.selectTab(ResumeTab.Profile) },
                        )
                        DropdownMenuItem(
                            text = { Text("Jobs") },
                            onClick = {
                                moreOpen = false
                                ctx.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse("https://myautomations.tomorrowtools.dev")),
                                )
                            },
                        )
                        DropdownMenuItem(
                            text = { Text("Sign out") },
                            onClick = { moreOpen = false; vm.signOut() },
                        )
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = vm.tab == ResumeTab.Prepare,
                    onClick = { if (!vm.busy) vm.selectTab(ResumeTab.Prepare) },
                    enabled = !vm.busy,
                    icon = { Icon(Icons.Filled.UploadFile, contentDescription = "Prepare") },
                    label = { Text("Prepare") },
                )
                NavigationBarItem(
                    selected = vm.tab == ResumeTab.Analyse || vm.tab == ResumeTab.Brand || vm.tab == ResumeTab.Profile || vm.tab == ResumeTab.Builder,
                    onClick = { if (!vm.busy) vm.selectTab(ResumeTab.Analyse) },
                    enabled = !vm.busy,
                    icon = { Icon(Icons.AutoMirrored.Filled.FactCheck, contentDescription = "Results") },
                    label = { Text("Results") },
                )
                NavigationBarItem(
                    selected = vm.tab == ResumeTab.Tailor,
                    onClick = { if (!vm.busy) vm.selectTab(ResumeTab.Tailor) },
                    enabled = !vm.busy,
                    icon = { Icon(Icons.Filled.AutoFixHigh, contentDescription = "Improve") },
                    label = { Text("Improve") },
                )
            }
        },
    ) { pad ->
        Column(Modifier.padding(pad).fillMaxSize()) {
            if (vm.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            vm.busyMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.tertiary, modifier = Modifier.padding(8.dp))
            }
            vm.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(8.dp))
            }
            vm.gateWarning?.let {
                Text(it, color = MaterialTheme.colorScheme.tertiary, modifier = Modifier.padding(8.dp))
            }
            if (canOpenMpi && !hideMpiPrompt) {
                Card(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            "help me prepare for this job with a mock interview",
                            modifier = Modifier.weight(1f).clickable { openMpiWithResumeContext(ctx, vm) },
                        )
                        TextButton(onClick = { hideMpiPrompt = true }) { Text("X") }
                    }
                }
            }
            when (vm.tab) {
                ResumeTab.Prepare -> PrepareTab(vm)
                ResumeTab.Analyse -> AnalyseTab(vm)
                ResumeTab.Tailor -> TailorTab(vm)
                ResumeTab.Brand -> BrandTab(vm)
                ResumeTab.Builder -> BuilderTab(vm)
                ResumeTab.Profile -> ProfileTab(vm)
            }
        }
    }
}

private fun openMpiWithResumeContext(ctx: android.content.Context, vm: ResumeStudioVm) {
    val resumePayload = vm.resumeText.trim().take(6000)
    val jdPayload = vm.jdText.trim().take(6000)
    val appUri = Uri.Builder()
        .scheme("ttmpi")
        .authority("open")
        .appendQueryParameter("source", "resume")
        .appendQueryParameter("resumeText", resumePayload)
        .appendQueryParameter("jdText", jdPayload)
        .build()
        .toString()
    openSiblingOrWeb(ctx, appUri, BuildConfig.SIBLING_APP_URL)
}

@Composable
private fun PrepareTab(vm: ResumeStudioVm) {
    val ctx = LocalContext.current
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let { vm.parseResumeUri(ctx, it) }
    }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Prepare", style = MaterialTheme.typography.titleLarge)
        Text("Paste or upload (.txt/.md/.pdf/.doc/.docx/.pptx/.xlsx/…). Scanned PDFs need OCR on server.")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { vm.startFreshPackage() }, enabled = !vm.busy) { Text("Fresh package") }
            OutlinedButton(
                onClick = { vm.continueLastSession() },
                enabled = !vm.busy,
            ) { Text("Continue last session") }
        }
        OutlinedTextField(
            value = vm.resumeText,
            onValueChange = vm::updateResume,
            label = { Text("Resume text") },
            modifier = Modifier.fillMaxWidth().height(220.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { pick.launch(PARSE_MIME_TYPES) }, enabled = !vm.busy) {
                Text("Upload resume file")
            }
            OutlinedButton(onClick = { vm.saveSession("prepare") }, enabled = !vm.busy) { Text("Save draft") }
        }
        OutlinedTextField(
            value = vm.jdUrl,
            onValueChange = vm::updateJdUrl,
            label = { Text("JD URL") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedButton(onClick = { vm.fetchJd() }, enabled = vm.jdUrl.isNotBlank() && !vm.busy) {
            Text("Fetch JD from URL")
        }
        OutlinedTextField(
            value = vm.jdText,
            onValueChange = vm::updateJd,
            label = { Text("Job description") },
            modifier = Modifier.fillMaxWidth().height(180.dp),
        )
        Button(
            onClick = { vm.analyse() },
            enabled = !vm.busy && vm.resumeText.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Analyse") }
        OutlinedButton(onClick = { vm.selectTab(ResumeTab.Builder) }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
            Text("Go to Templates")
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AnalyseTab(vm: ResumeStudioVm) {
    var dimDialog by remember { mutableStateOf<Pair<String, String>?>(null) }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Results", style = MaterialTheme.typography.titleLarge)
        if (vm.scoresArePreImprove) {
            Text(
                "Scores from last Analyse (pre-improve). Tap Re-analyse after edits.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.tertiary,
            )
        }
        Speedometers(vm.scores.overall, vm.scores.ats, vm.scores.keyword)
        Text("Improve")
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf("ats", "jd", "balanced").forEach { f ->
                FilterChip(
                    selected = vm.focus == f,
                    onClick = { if (!vm.busy) vm.improveWithFocus(f) },
                    enabled = !vm.busy,
                    label = { Text("Improve $f") },
                )
            }
        }
        vm.originalScores?.let {
            Text("As-is / Before", style = MaterialTheme.typography.titleMedium)
            Speedometers(it.overall, it.ats, it.keyword)
        }
        if (vm.scores.dimensions.isNotEmpty()) {
            Text("Dimensions", style = MaterialTheme.typography.titleMedium)
            vm.scores.dimensions.forEach { d ->
                Column(
                    Modifier
                        .padding(vertical = 4.dp)
                        .clickable {
                            dimDialog = d.label to explainDimension(d.id, d.label, d.note)
                        },
                ) {
                    Text("${d.label}: ${d.score ?: "—"}")
                    d.score?.let {
                        LinearProgressIndicator(
                            progress = { it.coerceIn(0, 100) / 100f },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    d.note?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
        if (vm.scores.sections.isNotEmpty()) {
            Text("Sections", style = MaterialTheme.typography.titleMedium)
            vm.scores.sections.forEach { s ->
                Text("${s.name}: ${s.score ?: "—"}${s.notes?.let { " — $it" } ?: ""}")
            }
        }
        if (vm.scores.skim.isNotEmpty()) {
            Text("Hiring skim", style = MaterialTheme.typography.titleMedium)
            vm.scores.skim.forEach { Text("• $it") }
        }
        SectionList("Strengths", vm.scores.strengths)
        SectionList("Gaps", vm.scores.gaps)
        Text("Matched", style = MaterialTheme.typography.titleMedium)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            vm.scores.matched.forEach { kw ->
                AssistChip(onClick = {}, label = { Text(kw) })
            }
        }
        Text("Missing — tap to queue", style = MaterialTheme.typography.titleMedium)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            vm.scores.missing.forEach { kw ->
                FilterChip(
                    selected = vm.queuedMissing.contains(kw),
                    onClick = { vm.toggleMissing(kw) },
                    label = { Text(kw) },
                )
            }
        }
        if (vm.queuedMissing.isNotEmpty()) {
            OutlinedButton(onClick = { vm.accommodateMissing() }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
                Text("Accommodate missing (${vm.queuedMissing.size})")
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Workbench", style = MaterialTheme.typography.titleMedium)
            TextButton(
                onClick = { vm.applyAllSuggestions() },
                enabled = !vm.allSuggestionsApplied() && !vm.busy,
            ) {
                Text(if (vm.allSuggestionsApplied()) "Applied all" else "Apply all")
            }
        }
        vm.scores.suggestions.forEach { s ->
            SuggestionCard(
                s = s,
                applied = vm.isSuggestionApplied(s),
                onAdd = { vm.applySuggestion(s, replace = false) },
                onReplace = { vm.applySuggestion(s, replace = true) },
                onTailor = { if (!vm.busy) vm.tailorSuggestion(s) },
            )
        }
        OutlinedTextField(
            value = vm.askQuestion,
            onValueChange = vm::updateAsk,
            label = { Text("Ask ATS") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedButton(onClick = { vm.askAts() }, enabled = vm.askQuestion.isNotBlank() && !vm.busy) {
            Text("Ask")
        }
        vm.askAnswer?.let { Text(it) }
        OutlinedButton(onClick = { vm.analyse() }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
            Text("Re-analyze with added improvements")
        }
        Button(onClick = { vm.selectTab(ResumeTab.Builder) }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
            Text("Continue to Templates")
        }
    }
    dimDialog?.let { (title, body) ->
        AlertDialog(
            onDismissRequest = { dimDialog = null },
            title = { Text(title) },
            text = { Text(body) },
            confirmButton = {
                TextButton(onClick = { dimDialog = null }) { Text("OK") }
            },
        )
    }
}

@Composable
private fun SuggestionCard(
    s: RewriteSuggestion,
    applied: Boolean,
    onAdd: () -> Unit,
    onReplace: () -> Unit,
    onTailor: () -> Unit,
) {
    Column(Modifier.padding(vertical = 6.dp).fillMaxWidth()) {
        Text(s.area, style = MaterialTheme.typography.titleSmall)
        if (s.current.isNotBlank()) {
            Text("Now: ${s.current}", style = MaterialTheme.typography.bodySmall)
        }
        Text("Try: ${s.suggested}")
        if (s.why.isNotBlank()) {
            Text(s.why, style = MaterialTheme.typography.bodySmall)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            if (s.current.isNotBlank()) {
                TextButton(onClick = onReplace, enabled = !applied) {
                    Text(if (applied) "Applied" else "Replace")
                }
            }
            TextButton(onClick = onAdd, enabled = !applied) { Text(if (applied) "Applied" else "Apply") }
            TextButton(onClick = onTailor) { Text("Tailor") }
        }
    }
}

@Composable
private fun Speedometers(overall: Int?, ats: Int?, keyword: Int?) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Gauge("Overall", overall)
        Gauge("ATS", ats)
        Gauge("JD", keyword)
    }
}

@Composable
private fun Gauge(label: String, value: Int?) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator(
            progress = { (value ?: 0).coerceIn(0, 100) / 100f },
            modifier = Modifier.size(72.dp).padding(4.dp),
            strokeWidth = 6.dp,
        )
        Text(label, style = MaterialTheme.typography.labelMedium)
        Text(value?.toString() ?: "—", style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun SectionList(title: String, items: List<String>) {
    if (items.isEmpty()) return
    Text(title, style = MaterialTheme.typography.titleMedium)
    items.forEach { Text("• $it") }
}

@Composable
private fun TailorTab(vm: ResumeStudioVm) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Improve", style = MaterialTheme.typography.titleLarge)
        if (vm.scoresArePreImprove) {
            Text(
                "Gauges below are pre-improve scores — Re-score after Improve.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.tertiary,
            )
        }
        Text("Focus")
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("ats", "jd", "balanced").forEach { f ->
                FilterChip(
                    selected = vm.focus == f,
                    onClick = { vm.updateFocus(f) },
                    enabled = !vm.busy,
                    label = { Text(f) },
                )
            }
        }
        Speedometers(vm.scores.overall, vm.scores.ats, vm.scores.keyword)
        Button(
            onClick = { vm.tailor() },
            enabled = !vm.busy && vm.jdText.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Improve (${vm.focus})") }
        vm.tailoredMd?.let {
            Text("Latest tailored resume", style = MaterialTheme.typography.titleMedium)
            Text(it.take(4000))
        }
        if (vm.versions.isNotEmpty()) {
            Text("Version history", style = MaterialTheme.typography.titleMedium)
            vm.versions.asReversed().forEach { snap ->
                TextButton(onClick = { vm.restoreVersion(snap) }) {
                    Text("${snap.label} · ${snap.focus}")
                }
            }
        }
        OutlinedButton(onClick = { vm.analyse() }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
            Text("Re-score after tailor")
        }
        Button(onClick = { vm.selectTab(ResumeTab.Builder) }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
            Text("Continue to Templates")
        }
    }
}

@Composable
private fun BrandTab(vm: ResumeStudioVm) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Career Brand", style = MaterialTheme.typography.titleLarge)
        OutlinedTextField(
            value = vm.targetRole,
            onValueChange = vm::updateTargetRole,
            label = { Text("Target role (optional)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = vm.linkedinPaste,
            onValueChange = vm::updateLinkedin,
            label = { Text("LinkedIn paste (optional)") },
            modifier = Modifier.fillMaxWidth().height(120.dp),
        )
        Button(onClick = { vm.loadBrand() }, enabled = vm.resumeText.isNotBlank() && !vm.busy) {
            Text("Generate brand kit")
        }
        vm.brandKit?.let { kit ->
            Text("Score: ${kit.score} · Niche: ${kit.niche}")
            Text(kit.positioning)
            kit.headlines.forEach { Text("• $it") }
            Text(kit.about)
        }
    }
}

@Composable
private fun BuilderTab(vm: ResumeStudioVm) {
    val ctx = LocalContext.current
    LaunchedEffect(Unit) { if (vm.templates.isEmpty()) vm.loadTemplates() }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Template Studio", style = MaterialTheme.typography.titleLarge)
        Text(
            "Ultra premium templates for ATS-safe exports. Pick your style, then generate and export.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer,
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Featured template", style = MaterialTheme.typography.labelMedium)
                val selected = vm.templates.firstOrNull { it.id == vm.selectedTemplate }
                Text(
                    selected?.name ?: "Classic",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    selected?.blurb ?: "Polished hierarchy, clean typography, ATS-first structure.",
                    style = MaterialTheme.typography.bodySmall,
                )
                Button(
                    onClick = { vm.structureForBuilder() },
                    enabled = !vm.busy,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Generate Premium Preview") }
            }
        }
        Text("Choose template", style = MaterialTheme.typography.titleMedium)
        vm.templates.forEach { t ->
            FilterChip(
                selected = vm.selectedTemplate == t.id,
                onClick = { vm.selectTemplate(t.id) },
                label = { Text(t.name) },
            )
        }
        Button(onClick = { vm.exportPdf(ctx) }, enabled = !vm.busy, modifier = Modifier.fillMaxWidth()) {
            Text("Export Premium PDF")
        }
        vm.pdfPath?.let { path ->
            Text("Saved: $path")
            OutlinedButton(onClick = {
                val file = File(path)
                val uri = FileProvider.getUriForFile(ctx, "dev.tomorrowtools.resume.fileprovider", file)
                ctx.startActivity(
                    Intent(Intent.ACTION_SEND).apply {
                        type = "application/pdf"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    },
                )
            }) { Text("Share PDF") }
        }
    }
}

private fun explainDimension(id: String, label: String, note: String?): String {
    val key = id.lowercase()
    val byId = when {
        key.contains("parse") || key.contains("clarity") ->
            "Parser clarity measures how reliably ATS can parse your resume structure, headings, and bullet formatting."
        key.contains("coverage") || key.contains("jd") ->
            "Role coverage measures how well your resume matches responsibilities and required skills from the job description."
        key.contains("impact") || key.contains("evidence") || key.contains("density") ->
            "Evidence density checks whether achievements have clear outcomes, metrics, and concrete proof of impact."
        key.contains("seniority") || key.contains("level") || key.contains("fit") ->
            "Level fit estimates whether wording and scope match the seniority expected for the target role."
        key.contains("complete") || key.contains("section") || key.contains("health") ->
            "Section health checks whether key resume sections are present and balanced for ATS readability."
        key.contains("contact") ->
            "Contact hygiene checks whether contact details are complete, professional, and ATS-safe."
        key.contains("signal") || key.contains("fluff") ->
            "Signal vs fluff estimates how much of the content is concrete value versus vague filler language."
        key.contains("edit") || key.contains("readiness") ->
            "Edit readiness measures how close the resume is to being submission-ready with minimal additional fixes."
        else ->
            "This dimension explains one part of your score and highlights where to improve next."
    }
    return listOfNotNull(byId, note?.takeIf { it.isNotBlank() }).joinToString("\n\n")
}

@Composable
private fun ProfileTab(vm: ResumeStudioVm) {
    LaunchedEffect(Unit) { vm.refreshProfile() }
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("Profile", style = MaterialTheme.typography.titleLarge)
        Text(vm.email ?: "")
        Text("Saved resumes", style = MaterialTheme.typography.titleMedium)
        vm.resumes.forEach { r ->
            Text(
                r.name ?: r.id,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { vm.useSavedResume(r) }
                    .padding(vertical = 6.dp),
            )
        }
        Text("Sessions", style = MaterialTheme.typography.titleMedium)
        vm.sessions.forEach { s ->
            Text(
                "${s.name ?: s.id} · ${s.step ?: ""}",
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { vm.loadSession(s.id) }
                    .padding(vertical = 6.dp),
            )
        }
        Spacer(Modifier.width(1.dp))
        OutlinedButton(onClick = { vm.saveSession() }) { Text("Save current session") }
    }
}
