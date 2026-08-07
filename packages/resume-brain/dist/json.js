export function extractJsonObject(text) {
    const raw = String(text || "").trim();
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fence ? fence[1].trim() : raw;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) {
        throw new Error("No JSON object in model response");
    }
    return JSON.parse(candidate.slice(start, end + 1));
}
//# sourceMappingURL=json.js.map