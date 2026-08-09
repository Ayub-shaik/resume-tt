package dev.tomorrowtools.resume.util

/** Extensions accepted by web AnyDoc parse (`/api/resumes/parse`). */
val PARSE_EXTENSIONS = setOf(
    "txt", "md", "pdf", "doc", "docx", "docm", "rtf", "odt",
    "pptx", "ppt", "xlsx", "xls", "csv", "epub",
)

/** MIME types for ActivityResultContracts.OpenDocument. */
val PARSE_MIME_TYPES = arrayOf(
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    "text/csv",
    "text/comma-separated-values",
    "text/rtf",
    "application/rtf",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-word.document.macroEnabled.12",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/epub+zip",
    "application/octet-stream",
)

fun parseExtensionAllowed(fileName: String): Boolean {
    val ext = fileName.substringAfterLast('.', "").lowercase()
    return ext in PARSE_EXTENSIONS
}
