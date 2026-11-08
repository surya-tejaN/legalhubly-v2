import { ActivityIndicator, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Link, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchSavedLawyers } from "@/lib/lawyers";
import { useAuth } from "@/providers/AuthProvider";
import { LawyerCard } from "@/components/LawyerCard";
import { EmptyState } from "@/components/ui";
import { colors, space } from "@/theme";
import { Pressable, Text } from "react-native";

export default function SavedScreen() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["saved-lawyers", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchSavedLawyers(user!.id),
  });

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 32, backgroundColor: colors.bg }}>
        <EmptyState title="Save lawyers you like" body="Sign in to keep a shortlist and open them later." />
        <Link href="/(auth)/login" asChild>
          <Pressable style={{ alignSelf: "center", marginTop: 12 }}>
            <Text style={{ color: colors.navy, fontWeight: "800" }}>Sign in</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (query.isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />;
  if (query.isError) return <EmptyState title="Couldn’t load saved lawyers" body="Pull to retry." />;

  return (
    <FlashList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={query.data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: space.md }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <LawyerCard lawyer={item} onPress={() => router.push(`/lawyer/${item.id}`)} />
      )}
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      ListEmptyComponent={<EmptyState title="Nothing saved yet" body="Open a lawyer and tap Save." />}
    />
  );
}
