// Self-harm / crisis guardrail for every RocketCV AI call (central, in runConfiguredAi). Adapted from the CareerGrip reference implementation.
// Runs on the server BEFORE any model call: on a match the model is never called, nothing is charged, and only the route name is logged (never the text).
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[@4]/g, "a").replace(/[!1|]/g, "i").replace(/0/g, "o").replace(/\$/g, "s")
  .replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

// Patterns run on the normalised text (letters and single spaces only). Kept specific so "kill the process" or "dying to learn Go" do not trigger.
const PATTERNS: RegExp[] = [
  // English
  /\bsuicid(e|al)\b/, /\bkill(ing)? my ?self\b/, /\bend(ing)? (my|this) (own )?life\b/, /\bend it all\b/,
  /\btake (my|his|her) own life\b/, /\b(want|wanna|going|plan(ning)?|ready|need|wish) to (die|be dead)\b/, /\bwant(ed)? (me )?dead\b/, /\bbetter off dead\b/,
  /\bdon t want to (live|be alive|exist|wake up)\b/, /\bno (reason|point) (in |to )?(living|live|life|going on)\b/, /\bnot worth living\b/, /\blife (is )?(not|isn t) worth\b/,
  /\bself ?harm(ing)?\b/, /\b(hurt|harm|cut|cutting|injure|starve) (my ?self|me)\b/, /\bcut my (wrist|wrists|arm|arms)\b/, /\b(overdose|od) on\b/, /\bhang (my ?self|me)\b/,
  /\bjump (off|from) (a |the |my )?(bridge|building|roof|terrace|balcony)\b/, /\bwish i (was|were) (dead|never born)\b/, /\bcan t go on\b/, /\bgive up on (life|living)\b/,
  // Hindi (romanised)
  /\bkhudkushi\b/, /\bkhud ?kushi\b/, /\ba+tm ?a+hatya\b/, /\baatm ?hatya\b/, /\bmar ?(jana|jaana|jaun|jau|na|na) ?(chahta|chahti|chahte|hai)\b/, /\bmarna chah(ta|ti|te)\b/, /\bmar jaun(ga|gi)\b/,
  /\bjaan de (dunga|dungi|dena)\b/, /\bapni jaan (le|de|lena|dena)\b/, /\bjeena nahi chah(ta|ti)\b/, /\bjeene ka (mann|man|mood) nahi\b/, /\bzindagi (khatam|se thak|ka koi matlab nahi)\b/, /\bjeene ki (iccha|ichha) nahi\b/, /\bmain mar jaana chah/,
  // Telugu (romanised)
  /\bchanipo(v|t|yina)\w*/, /\bchachipo(v|t|yina)\w*/, /\bnenu chachipo/, /\bchavalani (undi|vundi|anipistundi)\b/, /\bchacchipo/,
  /\bbatakal?enu\b/, /\bbathakalenu\b/, /\bbratakalenu\b/, /\bjeevitham (vaddu|nachadu|ayipoyindi)\b/, /\bbatakaalani (ledu|lev)\b/, /\bnannu nenu champu/, /\batma ?hatya\b/, /\baatma ?hatya\b/, /\bsuicide cheskuntanu\b/,
];

export function detectCrisis(text: unknown): boolean {
  if (typeof text !== "string" || text.length < 4) return false;
  const t = norm(text.slice(0, 6000));
  return PATTERNS.some(p => p.test(t));
}

export const CRISIS_REPLY =
  "I am really sorry you are going through this. You matter, and you do not have to carry it alone. Please talk to someone right now: " +
  "in India, Tele-MANAS is free and open 24x7 on 14416 or 1800-891-4416, and KIRAN (Ministry of Social Justice) is free on 1800-599-0019. " +
  "If you are in immediate danger, call your local emergency services (112 in India) or go to the nearest hospital, and tell someone you trust where you are. " +
  "I am an AI resume assistant and cannot give crisis support, but your career questions can wait: your wellbeing comes first.";

/** Log that a guardrail fired. Route name only: the text is never stored or logged. */
export function logCrisisEvent(route: string): void {
  console.warn(JSON.stringify({ event: "crisis_guardrail", route, at: new Date().toISOString() }));
}

/** Returns the support text (and logs) when the input is a crisis signal, else null. */
export function crisisGuard(route: string, ...texts: unknown[]): string | null {
  if (!texts.some(detectCrisis)) return null;
  logCrisisEvent(route);
  return CRISIS_REPLY;
}

/** Thrown before any model call when typed user text signals crisis; message is the support text. */
export class CrisisBlockedError extends Error {
  constructor() {
    super(CRISIS_REPLY);
    this.name = "CrisisBlockedError";
  }
}

const DOC_RE = /<<<BEGIN_UNTRUSTED_DOCUMENT[\s\S]*?<<<END_UNTRUSTED_DOCUMENT[^>]*>>>/g;

/** Throws CrisisBlockedError if user-role messages (outside uploaded/pasted document blocks) signal crisis. */
export function assertNoCrisis(messages: Array<{ role: string; content: string }>, route = "ai"): void {
  for (const m of messages) {
    if (m.role !== "user") continue;
    if (detectCrisis(m.content.replace(DOC_RE, " "))) {
      logCrisisEvent(route);
      throw new CrisisBlockedError();
    }
  }
}
