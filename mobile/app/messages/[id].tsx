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
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { fetchMessages, sendMessage, type ChatMessage } from "@/lib/conversations";
import { supabase } from "@/lib/supabase";
import { Banner } from "@/components/ui";
import { colors, font, radius, space } from "@/theme";

export default function MessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    navigation.setOptions({ title: "Chat" });
  }, [navigation]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchMessages(id)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load messages.");
      });

    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [id]);

  const onSend = async () => {
    const body = input.trim();
    if (!body || !id || !user || sending) return;
    setSending(true);
    setError("");
    try {
      const sent = await sendMessage(id, user.id, body);
      setInput("");
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return <Banner text="Sign in to view this conversation." />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          const mine = msg.sender_user_id === user.id;
          return (
            <View key={msg.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.body, mine && { color: colors.white }]}>{msg.body}</Text>
              <Text style={[styles.time, mine && { color: "rgba(255,255,255,0.65)" }]}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        })}
        {error ? <Banner text={error} /> : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable
          onPress={() => void onSend()}
          disabled={sending || !input.trim()}
          style={[styles.send, (sending || !input.trim()) && { opacity: 0.45 }]}
        >
          <Text style={styles.sendText}>{sending ? "…" : "Send"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.md, gap: 10, paddingBottom: 24 },
  bubble: { maxWidth: "85%", borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.navy },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  body: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  time: { fontSize: 10, color: colors.muted, marginTop: 4 },
  composer: {
    flexDirection: "row",
    gap: 8,
    padding: space.md,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: font.body,
  },
  send: {
    minHeight: 44,
    minWidth: 64,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  sendText: { color: colors.white, fontWeight: "800" },
});
