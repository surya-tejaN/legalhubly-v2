import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchChicagoLawyers } from "@/lib/lawyers";
import { PRACTICE_AREAS } from "@/lib/practiceAreas";
import { LawyerCard } from "@/components/LawyerCard";
import { EmptyState } from "@/components/ui";
import { OfflineBanner as NetBanner } from "@/components/OfflineBanner";
import { colors, font, radius, space } from "@/theme";

export default function LawyersScreen() {
  const [area, setArea] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const query = useInfiniteQuery({
    queryKey: ["lawyers", area, search],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchChicagoLawyers({ page: pageParam as number, practiceArea: area, query: search }),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
  });

  const lawyers = useMemo(
    () => query.data?.pages.flatMap((p) => p.rows) ?? [],
    [query.data],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <NetBanner />
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setSearch(q.trim())}
          placeholder="Search name, firm, or issue"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={styles.search}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All Chicago" active={!area} onPress={() => setArea(null)} />
          {PRACTICE_AREAS.map((a) => (
            <Chip key={a} label={a} active={area === a} onPress={() => setArea(area === a ? null : a)} />
          ))}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />
      ) : query.isError ? (
        <EmptyState title="Couldn’t load lawyers" body="Pull to retry when you’re back online." />
      ) : (
        <FlashList
          data={lawyers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: space.md, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <LawyerCard lawyer={item} onPress={() => router.push(`/lawyer/${item.id}`)} />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          ListEmptyComponent={
            <EmptyState title="No matches" body="Try another practice area or a shorter search." />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator color={colors.navy} style={{ margin: 16 }} /> : null
          }
        />
      )}
      {lawyers.length > 0 ? (
        <Text style={styles.count}>Chicago directory · {lawyers.length}{query.hasNextPage ? "+" : ""} shown</Text>
      ) : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && { color: colors.navy }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  searchWrap: { paddingHorizontal: space.md, paddingTop: space.sm, gap: 10 },
  search: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: font.body,
  },
  chips: { gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipText: { fontSize: font.tiny, fontWeight: "700", color: colors.muted },
  count: { textAlign: "center", color: colors.muted, fontSize: font.tiny, paddingBottom: 8 },
});
