import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { streamSupportReply, type ChatMessage } from "@/lib/supportChat";
import { cn } from "@/lib/utils";

const WELCOME =
  "Hi — I’m Legalhubly Support. I can help with how the platform works, accounts, consultations, and payments. I can’t give legal advice. What do you need?";

export default function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    if (!user) {
      setError("Sign in to chat with support.");
      return;
    }

    setError("");
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamSupportReply(
        next.filter((m) => m.content.length > 0),
        (delta) => {
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

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(100vw-2rem,380px)] h-[min(70vh,520px)] rounded-2xl border border-border bg-background shadow-elevated flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <div>
              <p className="text-sm font-semibold text-foreground">Support</p>
              <p className="text-[11px] text-muted-foreground">Guided answers · not legal advice</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close support chat"
            >
              <X className="h-4 w-4" />
            </button>
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
                {m.content || (busy ? "…" : "")}
              </div>
            ))}
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

          <form
            className="flex items-end gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={user ? "Ask about the platform…" : "Sign in to chat…"}
              disabled={!user || busy}
              rows={1}
              maxLength={2000}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button type="submit" size="icon" className="shrink-0 h-10 w-10" disabled={!user || busy || !input.trim()}>
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
