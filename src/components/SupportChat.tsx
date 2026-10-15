import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageCircle, X, Send, Loader2, Mic, MicOff, Volume2, VolumeX,
  ImagePlus, Trash2, Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearSupportSessionId,
  loadSupportHistory,
  streamSupportReply,
  type ChatMessage,
} from "@/lib/supportChat";
import { fileToChatDataUrl } from "@/lib/chatImage";
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  normalizeTranscript,
  speakText,
  stopSpeaking,
  type SpeechRecognitionLike,
} from "@/lib/speechSupport";
import { isFeatureEnabled } from "@/config/features";
import { cn } from "@/lib/utils";

const WELCOME =
  "I’m your Legalhubly Match Coach for Chicago — trained to match you to the right practice area and real directory lawyers.\n\n1) Describe your issue in plain language\n2) I’ll name the practice area + 2–3 Chicago lawyers\n3) Connect — profiles, website, or message\n\nOnline booking is coming soon. I can’t give legal advice.\n\nVoice replies are off by default — tap the speaker icon if you want them read aloud.";

/** Turn URLs and app paths into clickable links (stays on current origin). */
function ChatText({ text }: { text: string }) {
  const tokens = text.split(/(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+|\/(?:client|chicago|signup|login|forgot-password|reset-password|contact|about)[^\s),.]*)/g);
  return (
    <>
      {tokens.map((token, i) => {
        if (!token) return null;
        const md = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (md) {
          const href = md[2];
          const label = md[1];
          if (href.startsWith("/")) {
            return (
              <Link key={i} to={href} className="underline font-medium text-accent break-all">
                {label}
              </Link>
            );
          }
          return (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline font-medium text-accent break-all">
              {label}
            </a>
          );
        }
        if (/^https?:\/\//i.test(token)) {
          try {
            const u = new URL(token);
            if (u.hostname.endsWith("legalhubly.com") && typeof window !== "undefined") {
              return (
                <Link key={i} to={`${u.pathname}${u.search}${u.hash}`} className="underline font-medium text-accent break-all">
                  {`${u.pathname}${u.search}` || token}
                </Link>
              );
            }
          } catch {
            // fall through
          }
          return (
            <a key={i} href={token} target="_blank" rel="noopener noreferrer" className="underline font-medium text-accent break-all">
              {token}
            </a>
          );
        }
        if (token.startsWith("/")) {
          return (
            <Link key={i} to={token} className="underline font-medium text-accent break-all">
              {token}
            </Link>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}

const QUICK_STARTS = [
  { label: "Describe my issue", prompt: "I need help finding a Chicago lawyer. Here’s my situation: " },
  { label: "Divorce / family", prompt: "My spouse wants a divorce and we have kids in Chicago. Who should I talk to?" },
  { label: "Immigration", prompt: "I need help with a green card / visa in Chicago." },
  { label: "Personal injury", prompt: "Someone rear-ended me in Chicago and I’m hurt. Who handles this?" },
];

export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  /** Off by default — voice is opt-in (browser TTS is rough on long replies). */
  const [handsFree, setHandsFree] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voiceOutRef = useRef(voiceOut);
  const handsFreeRef = useRef(handsFree);
  const busyRef = useRef(busy);
  const pendingImageRef = useRef<string | null>(null);
  const sendRef = useRef<(override?: string, image?: string | null) => Promise<void>>(async () => {});

  const voiceEnabled = isFeatureEnabled("supportChatVoice");
  const canListen = voiceEnabled && isSpeechRecognitionSupported();
  const canSpeak = voiceEnabled && isSpeechSynthesisSupported();

  useEffect(() => {
    voiceOutRef.current = voiceOut;
  }, [voiceOut]);
  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    pendingImageRef.current = pendingImage;
  }, [pendingImage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, interim, pendingImage]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      recognitionRef.current?.abort();
      setListening(false);
      setHearing(false);
      setInterim("");
      stopSpeaking();
      setSpeaking(false);
    }
  }, [open]);

  // Resume persisted Match Coach session (production pattern)
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const history = await loadSupportHistory();
      if (cancelled || history.length === 0) return;
      setMessages([{ role: "assistant", content: WELCOME }, ...history]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setHearing(false);
    setInterim("");
  };

  const startListening = () => {
    if (!user || busyRef.current || listening) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice input isn’t supported in this browser. Try Chrome or Edge.");
      return;
    }

    setError("");
    stopSpeaking();
    setSpeaking(false);

    const recognition = new Ctor();
    recognition.continuous = handsFreeRef.current;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalChunk = "";

    recognition.onspeechstart = () => setHearing(true);
    recognition.onspeechend = () => setHearing(false);

    recognition.onresult = (ev) => {
      let interimText = "";
      let finals = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i][0]?.transcript || "";
        if (ev.results[i].isFinal) finals += piece;
        else interimText += piece;
      }
      if (finals) {
        finalChunk = normalizeTranscript(`${finalChunk} ${finals}`.trim());
        setInput(finalChunk);
        setInterim("");
      } else {
        setInterim(normalizeTranscript(interimText));
      }

      // Hands-free: auto-send when a final phrase arrives
      if (finals && handsFreeRef.current && !busyRef.current) {
        const toSend = normalizeTranscript(`${finalChunk}`.trim());
        if (toSend.length >= 2) {
          recognition.stop();
          void sendRef.current(toSend, pendingImageRef.current);
          finalChunk = "";
        }
      }
    };

    recognition.onerror = (ev) => {
      setListening(false);
      setHearing(false);
      setInterim("");
      if (ev.error === "not-allowed") {
        setError("Microphone permission denied. Allow mic access to use voice.");
      } else if (ev.error !== "aborted" && ev.error !== "no-speech") {
        setError("Couldn’t hear that. Tap the mic and try again.");
      }
    };

    recognition.onend = () => {
      setListening(false);
      setHearing(false);
      setInterim("");
      // Non–hands-free: leave transcript in the box for user to send
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Couldn’t start the microphone. Try again.");
      setListening(false);
    }
  };

  const send = async (overrideText?: string, imageOverride?: string | null) => {
    const text = (overrideText ?? input).trim();
    const imageUrl = imageOverride !== undefined ? imageOverride : pendingImage;
    if ((!text && !imageUrl) || busy) return;

    if (!user) {
      setError("Sign in to chat with support.");
      return;
    }

    stopListening();
    setError("");
    setInput("");
    setPendingImage(null);
    setInterim("");

    const userMsg: ChatMessage = {
      role: "user",
      content: text || (imageUrl ? "Please look at this photo." : ""),
      ...(imageUrl ? { imageUrl } : {}),
    };
    const next: ChatMessage[] = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let fullReply = "";

    try {
      await streamSupportReply(
        next.filter((m) => m.content.length > 0 || Boolean(m.imageUrl)),
        (delta) => {
          fullReply += delta;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: last.content + delta };
            }
            return copy;
          });
        },
        controller.signal,
      );

      // Opt-in only; speak a short cleaned summary (not full URLs/markdown)
      if (voiceOutRef.current && canSpeak && fullReply.trim()) {
        setSpeaking(true);
        speakText(fullReply, {
          maxChars: 200,
          onEnd: () => setSpeaking(false),
          onStart: () => setSpeaking(true),
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && !last.content) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  sendRef.current = send;

  const onPickImage = async (file: File | undefined) => {
    if (!file || !user) return;
    try {
      setError("");
      const dataUrl = await fileToChatDataUrl(file);
      setPendingImage(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load photo.");
    }
  };

  const displayInput = listening && interim ? `${input}${input ? " " : ""}${interim}` : input;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(100vw-2rem,400px)] h-[min(72vh,560px)] rounded-2xl border border-border bg-background shadow-elevated flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div>
              <p className="text-sm font-semibold text-foreground">Match Coach</p>
              <p className="text-[10px] text-muted-foreground">Describe → Match → Connect · Chicago</p>
            </div>
            <div className="flex items-center gap-0.5">
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    clearSupportSessionId();
                    setMessages([{ role: "assistant", content: WELCOME }]);
                    setError("");
                  }}
                  className="px-2 py-1 text-[10px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Start a new chat"
                >
                  New
                </button>
              )}
              {canListen && (
                <button
                  type="button"
                  onClick={() => setHandsFree((v) => !v)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    handsFree
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  aria-label={handsFree ? "Hands-free on" : "Tap-to-talk mode"}
                  title={handsFree ? "Hands-free (auto-send)" : "Tap mic, then Send"}
                >
                  <Hand className="h-4 w-4" />
                </button>
              )}
              {canSpeak && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceOut((v) => {
                      if (v) {
                        stopSpeaking();
                        setSpeaking(false);
                      }
                      return !v;
                    });
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    voiceOut
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  aria-label={voiceOut ? "Mute spoken replies" : "Enable spoken replies"}
                  title={voiceOut ? "Mute replies" : "Speak replies"}
                >
                  {voiceOut ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close support chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-accent text-accent-foreground"
                    : "mr-auto bg-muted text-foreground",
                )}
              >
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    alt="Attached"
                    className="mb-2 max-h-40 rounded-lg border border-black/10 object-cover w-full"
                  />
                )}
                {m.content
                  ? <ChatText text={m.content} />
                  : (busy && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}

            {!user && (
              <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground space-y-2">
                <p>Sign in free to use Match Coach — describe your issue and get Chicago lawyer matches.</p>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="h-8 text-xs">
                    <Link to="/login">Sign in</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link to="/signup">Sign up</Link>
                  </Button>
                </div>
              </div>
            )}

            {user && messages.length <= 2 && !busy && (
              <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      if (q.prompt.endsWith(": ")) {
                        setInput(q.prompt);
                      } else {
                        void send(q.prompt);
                      }
                    }}
                    className="text-[11px] px-2.5 py-1.5 rounded-full border border-border bg-card text-foreground hover:border-accent/40 hover:bg-accent/5 transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {(listening || speaking) && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-end gap-0.5 h-4">
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className={cn(
                        "w-1 rounded-full bg-accent transition-all",
                        listening || speaking ? "animate-pulse" : "opacity-40",
                      )}
                      style={{
                        height: hearing || speaking ? `${8 + ((bar * 3 + 2) % 10)}px` : "4px",
                        animationDelay: `${bar * 80}ms`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {speaking ? "Speaking reply…" : hearing ? "Hearing you…" : "Listening…"}
                </p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="px-3 pb-2 text-xs text-destructive">
              {error}{" "}
              {!user && (
                <Link to="/login" className="underline font-medium">
                  Sign in
                </Link>
              )}
            </div>
          )}

          {pendingImage && (
            <div className="px-3 pb-2">
              <div className="relative inline-block">
                <img
                  src={pendingImage}
                  alt="Ready to send"
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          <form
            className="flex items-end gap-1.5 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                void onPickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="shrink-0 h-10 w-10"
              disabled={!user || busy}
              aria-label="Upload gallery photo"
              title="Upload photo from gallery"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <textarea
              value={displayInput}
              onChange={(e) => {
                if (!listening) setInput(e.target.value);
              }}
              placeholder={
                user
                  ? listening
                    ? handsFree
                      ? "Speak — I’ll send when you pause…"
                      : "Listening…"
                    : "Describe your legal issue in plain language…"
                  : "Sign in to use Match Coach…"
              }
              disabled={!user || busy}
              rows={1}
              maxLength={2000}
              className={cn(
                "flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60",
                listening && "ring-2 ring-accent/30 border-accent/40",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {canListen && (
              <Button
                type="button"
                size="icon"
                variant={listening ? "destructive" : "outline"}
                className={cn(
                  "shrink-0 h-10 w-10 relative",
                  listening && hearing && "animate-pulse",
                )}
                disabled={!user || busy}
                aria-label={listening ? "Stop listening" : "Speak your question"}
                title={listening ? "Stop" : handsFree ? "Hands-free voice" : "Voice input"}
                onClick={() => {
                  if (listening) stopListening();
                  else startListening();
                }}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              className="shrink-0 h-10 w-10"
              disabled={!user || busy || (!input.trim() && !pendingImage)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}

      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-12 w-12 rounded-full shadow-elevated"
        size="icon"
        aria-label={open ? "Close support" : "Open support chat"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
