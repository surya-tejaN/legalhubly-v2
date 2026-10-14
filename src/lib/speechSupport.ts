/** Browser speech helpers for SupportChat (Web Speech API). */

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultEventLike = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
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

export function speakText(text: string, lang = "en-US"): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.trim());
  utter.lang = lang;
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
