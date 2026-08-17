package dev.tomorrowtools.resume.util

import dev.tomorrowtools.resume.appJson
import dev.tomorrowtools.resume.data.DimensionView
import dev.tomorrowtools.resume.data.RewriteSuggestion
import dev.tomorrowtools.resume.data.ScoreView
import dev.tomorrowtools.resume.data.SectionView
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private fun JsonObject.intOf(vararg keys: String): Int? {
    for (k in keys) {
        val v = this[k] ?: continue
        v.jsonPrimitive.intOrNull?.let { return it }
        v.jsonPrimitive.contentOrNull?.toIntOrNull()?.let { return it }
    }
    return null
}

private fun JsonObject.strOf(vararg keys: String): String? {
    for (k in keys) {
        val v = this[k] as? JsonPrimitive ?: continue
        return v.contentOrNull
    }
    return null
}

private fun JsonObject.strList(vararg keys: String): List<String> {
    for (k in keys) {
        val v = this[k] ?: continue
        return when (v) {
            is JsonArray -> v.mapNotNull {
                when (it) {
                    is JsonPrimitive -> it.contentOrNull
                    is JsonObject -> it.strOf("term", "keyword", "text", "suggestion", "title")
                    else -> null
                }
            }
            is JsonPrimitive -> listOfNotNull(v.contentOrNull)
            else -> emptyList()
        }
    }
    return emptyList()
}

private fun parseDimensions(obj: JsonObject): List<DimensionView> {
    val arr = obj["dimensions"] as? JsonArray ?: return emptyList()
    return arr.mapNotNull { el ->
        val o = el as? JsonObject ?: return@mapNotNull null
        val label = o.strOf("label", "name", "id", "title") ?: return@mapNotNull null
        DimensionView(
            id = o.strOf("id") ?: label,
            label = label,
            score = o.intOf("score", "value"),
            note = o.strOf("notes", "note", "why", "detail", "rationale"),
        )
    }
}

private fun parseSections(obj: JsonObject): List<SectionView> {
    val arr = obj["sections"] as? JsonArray ?: return emptyList()
    return arr.mapNotNull { el ->
        val o = el as? JsonObject ?: return@mapNotNull null
        SectionView(
            name = o.strOf("name", "label") ?: return@mapNotNull null,
            score = o.intOf("score"),
            notes = o.strOf("notes", "note"),
        )
    }
}

private fun parseSuggestions(obj: JsonObject): List<RewriteSuggestion> {
    val keys = listOf("rewriteSuggestions", "suggestions", "rewrites", "improvements")
    for (k in keys) {
        val v = obj[k] ?: continue
        when (v) {
            is JsonArray -> {
                val out = v.mapIndexedNotNull { idx, el ->
                    when (el) {
                        is JsonPrimitive -> el.contentOrNull?.let {
                            RewriteSuggestion(area = "Suggestion ${idx + 1}", suggested = it)
                        }
                        is JsonObject -> {
                            val suggested = el.strOf("suggested", "suggestion", "text", "try", "improved")
                                ?: return@mapIndexedNotNull null
                            RewriteSuggestion(
                                area = el.strOf("area", "title", "section") ?: "Improvement",
                                current = el.strOf("current", "now", "before").orEmpty(),
                                suggested = suggested,
                                why = el.strOf("why", "reason", "rationale").orEmpty(),
                                kind = el.strOf("kind", "type").orEmpty(),
                            )
                        }
                        else -> null
                    }
                }
                if (out.isNotEmpty()) return out
            }
            else -> Unit
        }
    }
    return emptyList()
}

fun parseScoreView(el: JsonElement?): ScoreView {
    val empty = ScoreView(
        null, null, null, emptyList(), emptyList(), emptyList(), emptyList(),
        emptyList(), emptyList(), emptyList(), emptyList(),
    )
    val root = unwrapAnalysis(el) ?: return empty
    val scores = root["scores"] as? JsonObject
    val heuristic = root["heuristic"] as? JsonObject
    val dimensions = parseDimensions(root)
    var overall = root.intOf("overallScore", "overall", "score")
        ?: scores?.intOf("overallScore", "overall", "total")
    var ats = root.intOf("atsReadability", "ats", "readability")
        ?: scores?.intOf("atsReadability", "ats")
    var keyword = root.intOf("keywordMatchPct", "keywordMatch", "keywords", "jdCoverage")
        ?: scores?.intOf("keywordMatchPct", "keywordMatch", "keywords")
        ?: heuristic?.intOf("keywordMatchPct", "keywordMatch")
    if (overall == null && dimensions.isNotEmpty()) {
        val scored = dimensions.mapNotNull { it.score }
        if (scored.isNotEmpty()) overall = scored.average().toInt()
    }
    if (ats == null) {
        ats = dimensions.find { it.id == "atsParse" || it.label.contains("Parser", ignoreCase = true) }?.score
            ?: heuristic?.intOf("atsReadability", "ats")
    }
    if (keyword == null) {
        keyword = dimensions.find { it.id == "jdCoverage" || it.label.contains("coverage", ignoreCase = true) }?.score
            ?: heuristic?.intOf("keywordMatchPct", "keywordMatch")
    }
    val missing = root.strList("missingKeywords", "missing_keywords", "keywordsMissing")
    val matched = root.strList("matchedKeywords", "matched_keywords", "presentKeywords")
    val strengths = root.strList("strengths")
    val gaps = root.strList("gaps")
    val skim = root.strList("hiringSkim", "skim")
        .ifEmpty { listOfNotNull(root.strOf("hiringSkim", "skim", "summary")) }
    val suggestions = parseSuggestions(root)
    return ScoreView(
        overall = overall,
        ats = ats,
        keyword = keyword,
        strengths = strengths,
        gaps = gaps,
        missing = missing,
        matched = matched,
        suggestions = suggestions,
        skim = skim,
        dimensions = dimensions,
        sections = parseSections(root),
    )
}

/** Accept direct analysis JSON or wrapped `{ "analysis": { ... } }` from recovery/session. */
private fun unwrapAnalysis(el: JsonElement?): JsonObject? {
    val obj = el as? JsonObject ?: return null
    val nested = obj["analysis"]
    return when (nested) {
        is JsonObject -> nested
        is JsonPrimitive -> nested.contentOrNull?.let {
            runCatching { appJson.parseToJsonElement(it).jsonObject }.getOrNull()
        } ?: obj
        else -> obj
    }
}

fun ScoreView.hasAnyScore(): Boolean =
    overall != null || ats != null || keyword != null ||
        dimensions.any { it.score != null } || sections.any { it.score != null }
