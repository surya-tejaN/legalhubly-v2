/** Advanced browser speech helpers for SupportChat (Web Speech API). */

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string; confidence: number }; isFinal: boolean; length: number }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Prefer natural English voices when available. */
export function pickPreferredVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred = [
    /google us english/i,
    /samantha/i,
    /karen/i,
    /moira/i,
    /daniel/i,
    /en-us/i,
    /en_us/i,
  ];
  for (const re of preferred) {
    const match = voices.find((v) => re.test(v.name) || re.test(v.lang));
    if (match) return match;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
}

/** Strip URLs/markdown and shorten — browser TTS sounds bad on long Match Mode replies. */
export function textForSpeech(raw: string, maxChars = 220): string {
  let t = raw
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\/(?:client|chicago|lawyer|signup|login)[^\s)]*/gi, " ")
    .replace(/[*#_>`|]+/g, "")
    .replace(/★/g, " rated ")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > maxChars) {
    t = `${t.slice(0, maxChars).replace(/\s+\S*$/, "")}.`;
  }
  return t;
}

export function speakText(
  text: string,
  opts?: { lang?: string; onEnd?: () => void; onStart?: () => void; maxChars?: number },
): void {
  const spoken = textForSpeech(text, opts?.maxChars ?? 220);
  if (!isSpeechSynthesisSupported() || !spoken) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(spoken);
  utter.lang = opts?.lang ?? "en-US";
  utter.rate = 1.02;
  utter.pitch = 1;
  const voice = pickPreferredVoice();
  if (voice) utter.voice = voice;
  if (opts?.onStart) utter.onstart = () => opts.onStart?.();
  if (opts?.onEnd) utter.onend = () => opts.onEnd?.();
  // Chrome sometimes has empty voices until voiceschanged
  if (!voice && window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = pickPreferredVoice();
      if (v) utter.voice = v;
      window.speechSynthesis.speak(utter);
    };
    return;
  }
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/** Soften transcript for chat (trim, collapse spaces, capitalize first letter). */
export function normalizeTranscript(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
