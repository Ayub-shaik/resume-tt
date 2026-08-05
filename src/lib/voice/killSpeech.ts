/** Hard-stop browser TTS (and any queued utterances). Safe to call anywhere. */
export function killAllSpeech(): void {
  if (typeof window === "undefined") return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
