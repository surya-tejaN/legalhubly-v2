import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import {
  clearSupportSessionId,
  lawyerIdFromPath,
  loadSupportHistory,
  streamSupportReply,
  type ChatMessage,
} from "@/lib/supportChat";
import { Banner, Button } from "@/components/ui";
import { colors, font, radius, space } from "@/theme";

const WELCOME =
  "I’m your Legalhubly Match Coach for Chicago. Describe your situation in plain language and I’ll match the practice area plus Chicago lawyers.\n\nI don’t give legal advice. Online booking is coming soon.";

const QUICK = [
  { label: "Divorce / family", prompt: "My spouse wants a divorce and we have kids in Chicago. Who should I talk to?" },
  { label: "Immigration", prompt: "I need help with a green card / visa in Chicago." },
  { label: "Personal injury", prompt: "Someone rear-ended me in Chicago and I’m hurt. Who handles this?" },
];

const FOLLOW_UPS = [
  { label: "Faster response", prompt: "Who usually replies fastest among those matches?" },
  { label: "Spanish-speaking", prompt: "Which of those lawyers speak Spanish?" },
  { label: "Lower cost", prompt: "Who is likely more affordable for a first consult?" },
];

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadSupportHistory().then((history) => {
      if (cancelled || history.length === 0) return;
      setMessages([{ role: "assistant", content: WELCOME }, ...history]);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [user?.id]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy || !user) return;
    setError("");
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamSupportReply(next, (delta) => {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        });
      }, ac.signal);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateTitle}>Sign in to use Match Coach</Text>
        <Text style={styles.gateBody}>Same account as the website. Describe your issue and get Chicago lawyer matches.</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.cta}><Text style={styles.ctaText}>Sign in</Text></Pressable>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={88}>
      <View style={styles.toolbar}>
        <Text style={styles.hint}>Describe → Match → Connect</Text>
        <Pressable
          onPress={async () => {
            abortRef.current?.abort();
            await clearSupportSessionId();
            setMessages([{ role: "assistant", content: WELCOME }]);
            setError("");
          }}
        >
          <Text style={styles.newChat}>New</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => (
          <Bubble key={`${m.role}-${i}`} message={m} />
        ))}
        {messages.length <= 2 && !busy ? (
          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <Pressable key={q.label} onPress={() => void send(q.prompt)} style={styles.quick}>
                <Text style={styles.quickText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {user && !busy && messages.length > 2 &&
        messages[messages.length - 1]?.role === "assistant" &&
        messages[messages.length - 1].content.includes("/client/lawyer/") ? (
          <View style={styles.quickRow}>
            {FOLLOW_UPS.map((q) => (
              <Pressable key={q.label} onPress={() => void send(q.prompt)} style={styles.quick}>
                <Text style={styles.quickText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {error ? <Banner text={error} /> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Describe your legal issue…"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
          editable={!busy}
        />
        <Button label={busy ? "…" : "Send"} onPress={() => void send(input)} disabled={busy || !input.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "user";
  const lawyerId = !mine ? lawyerIdFromPath(message.content) : null;
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.bubbleText, mine && { color: colors.white }]}>{message.content || (mine ? "" : "…")}</Text>
      {lawyerId ? (
        <Pressable onPress={() => router.push(`/lawyer/${lawyerId}`)}>
          <Text style={styles.openProfile}>Open a matched lawyer →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: space.md, paddingVertical: 8 },
  hint: { color: colors.muted, fontSize: font.tiny, fontWeight: "600" },
  newChat: { color: colors.navy, fontWeight: "800", fontSize: font.small },
  list: { padding: space.md, gap: 10, paddingBottom: 24 },
  bubble: { maxWidth: "88%", borderRadius: radius.lg, padding: 12 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.navy },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bubbleText: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  openProfile: { marginTop: 8, color: colors.navy, fontWeight: "800", fontSize: font.tiny },
  composer: { flexDirection: "row", gap: 8, padding: space.md, alignItems: "flex-end", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, color: colors.text },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quick: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8 },
  quickText: { fontSize: font.tiny, fontWeight: "700", color: colors.text },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: 12, backgroundColor: colors.bg },
  gateTitle: { fontSize: font.h2, fontWeight: "800", color: colors.navy, textAlign: "center" },
  gateBody: { color: colors.muted, textAlign: "center" },
  cta: { backgroundColor: colors.navy, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  ctaText: { color: colors.white, fontWeight: "800" },
});
