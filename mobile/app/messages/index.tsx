import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Link, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchInbox } from "@/lib/conversations";
import { useAuth } from "@/providers/AuthProvider";
import { EmptyState } from "@/components/ui";
import { colors, font, radius, space } from "@/theme";

export default function MessagesInboxScreen() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["inbox", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchInbox(user!.id),
  });

  if (!user) {
    return (
      <View style={styles.gate}>
        <EmptyState title="Sign in to message lawyers" body="Same account as the website. Open a lawyer profile, then tap Message." />
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.cta}><Text style={styles.ctaText}>Sign in</Text></Pressable>
        </Link>
      </View>
    );
  }

  if (query.isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />;
  if (query.isError) return <EmptyState title="Couldn’t load messages" body="Pull to retry when you’re back online." />;

  return (
    <FlashList
      data={query.data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: space.md, backgroundColor: colors.bg }}
      style={{ flex: 1, backgroundColor: colors.bg }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      ListEmptyComponent={
        <EmptyState title="No messages yet" body="Open a lawyer’s profile and tap Message to start a conversation." />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/messages/${item.id}`)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.avatar}><Text style={styles.avatarText}>{item.title.slice(0, 1)}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {item.subtitle || new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, justifyContent: "center", padding: space.xl, backgroundColor: colors.bg },
  cta: { alignSelf: "center", marginTop: 12, backgroundColor: colors.navy, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  ctaText: { color: colors.white, fontWeight: "800" },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    height: 44, width: 44, borderRadius: 22, backgroundColor: colors.goldSoft,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontWeight: "800", color: colors.navy },
  title: { fontWeight: "800", color: colors.text, fontSize: font.body },
  sub: { color: colors.muted, fontSize: font.small, marginTop: 2 },
});
