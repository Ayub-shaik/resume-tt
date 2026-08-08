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
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import dev.tomorrowtools.resume.BuildConfig
import dev.tomorrowtools.resume.data.RewriteSuggestion
import dev.tomorrowtools.resume.util.openSiblingOrWeb
import dev.tomorrowtools.resume.vm.ResumeStudioVm
import dev.tomorrowtools.resume.vm.ResumeTab
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudioScreen(vm: ResumeStudioVm) {
    val ctx = LocalContext.current
    val tabs = ResumeTab.entries
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Resume ATS") },
                actions = {
                    TextButton(onClick = {
                        openSiblingOrWeb(ctx, "ttmpi://open", BuildConfig.SIBLING_APP_URL)
                    }) { Text("MPI") }
                    TextButton(onClick = {
                        ctx.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse("https://myautomations.tomorrowtools.dev")),
                        )
                    }) { Text("Jobs") }
                    TextButton(onClick = { vm.signOut() }) { Text("Sign out") }
                },
            )
        },
    ) { pad ->
        Column(Modifier.padding(pad).fillMaxSize()) {
            ScrollableTabRow(selectedTabIndex = tabs.indexOf(vm.tab)) {
                tabs.forEach { t ->
                    Tab(
                        selected = vm.tab == t,
                        onClick = { vm.selectTab(t) },
                        text = { Text(t.name) },
                    )
                }
            }
            if (vm.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            vm.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(8.dp))
            }
            vm.gateWarning?.let {
                Text(it, color = MaterialTheme.colorScheme.tertiary, modifier = Modifier.padding(8.dp))
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

@Composable
private fun PrepareTab(vm: ResumeStudioVm) {
    val ctx = LocalContext.current
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
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
        Text("Paste or upload resume text, then add a job description.")
        OutlinedTextField(
            value = vm.resumeText,
            onValueChange = vm::updateResume,
            label = { Text("Resume text") },
            modifier = Modifier.fillMaxWidth().height(220.dp),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { pick.launch("*/*") }) { Text("Upload / parse") }
            OutlinedButton(onClick = { vm.saveSession("prepare") }) { Text("Save draft") }
        }
        OutlinedTextField(
            value = vm.jdUrl,
            onValueChange = vm::updateJdUrl,
            label = { Text("JD URL") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedButton(onClick = { vm.fetchJd() }, enabled = vm.jdUrl.isNotBlank()) {
            Text("Fetch JD from URL")
        }
        OutlinedTextField(
            value = vm.jdText,
            onValueChange = vm::updateJd,
            label = { Text("Job description") },
            modifier = Modifier.fillMaxWidth().height(180.dp),
        )
        Button(onClick = { vm.analyse() }, enabled = !vm.busy && vm.resumeText.isNotBlank()) {
            Text("Analyse")
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AnalyseTab(vm: ResumeStudioVm) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text("Analyse & improve", style = MaterialTheme.typography.titleLarge)
        Speedometers(vm.scores.overall, vm.scores.ats, vm.scores.keyword)
        vm.originalScores?.let {
            Text("As-is / Before", style = MaterialTheme.typography.titleMedium)
            Speedometers(it.overall, it.ats, it.keyword)
        }
        if (vm.scores.dimensions.isNotEmpty()) {
            Text("Dimensions", style = MaterialTheme.typography.titleMedium)
            vm.scores.dimensions.forEach { d ->
                Column(Modifier.padding(vertical = 4.dp)) {
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
        Text("Matched keywords", style = MaterialTheme.typography.titleMedium)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            vm.scores.matched.forEach { kw ->
                AssistChip(onClick = {}, label = { Text(kw) })
            }
        }
        Text("Missing — tap to queue for Tailor", style = MaterialTheme.typography.titleMedium)
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
            OutlinedButton(onClick = { vm.accommodateMissing() }) {
                Text("Accommodate missing (${vm.queuedMissing.size})")
            }
        }
        Text("Rewrite workbench", style = MaterialTheme.typography.titleMedium)
        vm.scores.suggestions.forEach { s ->
            SuggestionCard(s, onAdd = { vm.applySuggestion(s, replace = false) }, onReplace = {
                vm.applySuggestion(s, replace = true)
            })
        }
        OutlinedTextField(
            value = vm.askQuestion,
            onValueChange = vm::updateAsk,
            label = { Text("Ask ATS") },
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedButton(onClick = { vm.askAts() }, enabled = vm.askQuestion.isNotBlank()) {
            Text("Ask")
        }
        vm.askAnswer?.let { Text(it) }
        Button(onClick = { vm.selectTab(ResumeTab.Tailor) }) { Text("Go to Tailor") }
        OutlinedButton(onClick = { vm.analyse() }) { Text("Re-analyse") }
    }
}

@Composable
private fun SuggestionCard(
    s: RewriteSuggestion,
    onAdd: () -> Unit,
    onReplace: () -> Unit,
) {
    Column(Modifier.padding(vertical = 6.dp)) {
        Text(s.area, style = MaterialTheme.typography.titleSmall)
        if (s.kind.isNotBlank()) {
            Text(s.kind, style = MaterialTheme.typography.labelSmall)
        }
        if (s.current.isNotBlank()) {
            Text("Now: ${s.current}", style = MaterialTheme.typography.bodySmall)
        }
        Text("Try: ${s.suggested}")
        if (s.why.isNotBlank()) {
            Text(s.why, style = MaterialTheme.typography.bodySmall)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (s.current.isNotBlank()) {
                TextButton(onClick = onReplace) { Text("Replace") }
            }
            TextButton(onClick = onAdd) { Text("Apply add") }
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
        Gauge("Keywords", keyword)
    }
}

@Composable
private fun Gauge(label: String, value: Int?) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        BoxGauge(value)
        Text(label, style = MaterialTheme.typography.labelMedium)
        Text("${value ?: "—"}", style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun BoxGauge(value: Int?) {
    val progress = (value ?: 0).coerceIn(0, 100) / 100f
    CircularProgressIndicator(
        progress = { progress },
        modifier = Modifier.size(72.dp).padding(4.dp),
        strokeWidth = 6.dp,
    )
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
        Text("Tailor", style = MaterialTheme.typography.titleLarge)
        Text("Focus")
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("ats", "jd", "balanced").forEach { f ->
                FilterChip(
                    selected = vm.focus == f,
                    onClick = { vm.updateFocus(f) },
                    label = { Text(f) },
                )
            }
        }
        Speedometers(vm.scores.overall, vm.scores.ats, vm.scores.keyword)
        Button(onClick = { vm.tailor() }, enabled = !vm.busy && vm.jdText.isNotBlank()) {
            Text("Improve (${vm.focus})")
        }
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
        OutlinedButton(onClick = { vm.analyse() }) { Text("Re-score after tailor") }
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
            label = { Text("LinkedIn About / paste (optional)") },
            modifier = Modifier.fillMaxWidth().height(120.dp),
        )
        Button(onClick = { vm.loadBrand() }, enabled = vm.resumeText.isNotBlank() && !vm.busy) {
            Text("Generate brand kit")
        }
        vm.brandKit?.let { kit ->
            Text("Score: ${kit.score} · Niche: ${kit.niche}")
            Text("Positioning", style = MaterialTheme.typography.titleMedium)
            Text(kit.positioning)
            Text("Headlines", style = MaterialTheme.typography.titleMedium)
            kit.headlines.forEach { Text("• $it") }
            Text("About", style = MaterialTheme.typography.titleMedium)
            Text(kit.about)
            Text("Experience tips", style = MaterialTheme.typography.titleMedium)
            kit.experienceTips.forEach { Text("• $it") }
            Text("Checklist", style = MaterialTheme.typography.titleMedium)
            kit.checklist.forEach {
                Text("${if (it.ok) "✓" else "○"} ${it.label} — ${it.tip}")
            }
            Text("Keywords present: ${kit.keywords.present.joinToString()}")
            Text("Keywords missing: ${kit.keywords.missing.joinToString()}")
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
        Text("Builder / export", style = MaterialTheme.typography.titleLarge)
        Button(onClick = { vm.structureForBuilder() }, enabled = !vm.busy) {
            Text("Structure resume for templates")
        }
        Text("Templates", style = MaterialTheme.typography.titleMedium)
        vm.templates.forEach { t ->
            FilterChip(
                selected = vm.selectedTemplate == t.id,
                onClick = { vm.selectTemplate(t.id) },
                label = { Text("${t.name}${t.blurb?.let { " — $it" } ?: ""}") },
            )
        }
        Button(onClick = { vm.exportPdf(ctx) }, enabled = !vm.busy) { Text("Export PDF") }
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
        if (vm.busy) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                CircularProgressIndicator()
            }
        }
        Spacer(Modifier.width(1.dp))
        OutlinedButton(onClick = { vm.saveSession() }) { Text("Save current session") }
    }
}
