import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Globe, Star, MessageSquare } from "lucide-react-native";
import { fetchLawyer, fetchSavedLawyerIds, toggleSavedLawyer } from "@/lib/lawyers";
import { getOrCreateDirectConversation } from "@/lib/conversations";
import { resolveLawyerWebsiteHref } from "@/lib/lawyerWebsite";
import { useAuth } from "@/providers/AuthProvider";
import { Banner, EmptyState } from "@/components/ui";
import { colors, font, radius, space } from "@/theme";

export default function LawyerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msgError, setMsgError] = useState("");
  const [messaging, setMessaging] = useState(false);

  const lawyerQ = useQuery({
    queryKey: ["lawyer", id],
    enabled: Boolean(id),
    queryFn: () => fetchLawyer(id!),
  });

  const savedQ = useQuery({
    queryKey: ["saved-ids", user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchSavedLawyerIds(user!.id),
  });

  const lawyer = lawyerQ.data;
  const saved = Boolean(id && savedQ.data?.includes(id));

  useEffect(() => {
    if (lawyer?.name) navigation.setOptions({ title: lawyer.name });
  }, [lawyer?.name, navigation]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Sign in to save lawyers.");
      await toggleSavedLawyer(user.id, id, saved);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["saved-ids"] });
      void qc.invalidateQueries({ queryKey: ["saved-lawyers"] });
    },
  });

  if (lawyerQ.isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.navy} />;
  }
  if (lawyerQ.isError || !lawyer) {
    return <EmptyState title="Lawyer not found" body="They may have been removed from the Chicago directory." />;
  }

  const site = resolveLawyerWebsiteHref({
    websiteUrl: lawyer.website_url,
    name: lawyer.name,
    firm: lawyer.firm,
  });

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.initials}>{lawyer.avatar_initials}</Text></View>
        <Text style={styles.name}>{lawyer.name}</Text>
        <Text style={styles.firm}>{lawyer.firm}</Text>
        <View style={styles.row}>
          <Star size={14} color={colors.gold} fill={colors.gold} />
          <Text style={styles.meta}>
            {(lawyer.rating || 0).toFixed(1)} · {lawyer.review_count} reviews · {lawyer.experience_years}+ years · Chicago
          </Text>
        </View>
        {lawyer.verified ? <Text style={styles.verified}>Verified listing</Text> : null}
      </View>

      {saveMut.isError ? <Banner text={(saveMut.error as Error).message} /> : null}

      {msgError ? <Banner text={msgError} /> : null}

      <Pressable
        onPress={() => {
          if (!user) {
            router.push("/(auth)/login");
            return;
          }
          saveMut.mutate();
        }}
        style={[styles.save, saved && { backgroundColor: colors.goldSoft, borderColor: colors.gold }]}
      >
        <Heart size={16} color={saved ? colors.navy : colors.muted} fill={saved ? colors.navy : "transparent"} />
        <Text style={styles.saveText}>{saved ? "Saved" : user ? "Save" : "Sign in to save"}</Text>
      </Pressable>

      <Section title="Practice areas" body={(lawyer.practice_areas || []).join(" · ")} />
      {lawyer.languages?.length ? <Section title="Languages" body={lawyer.languages.join(" · ")} /> : null}
      {lawyer.short_description ? <Section title="About" body={lawyer.short_description} /> : null}
      {lawyer.bio ? <Section title="Bio" body={lawyer.bio} /> : null}
      {lawyer.consultation_fee != null ? (
        <Section
          title="Consultation"
          body={lawyer.consultation_fee === 0 ? "Free consultation listed" : `Listed consultation fee $${lawyer.consultation_fee}`}
        />
      ) : null}

      <Pressable
        style={styles.web}
        onPress={() => void WebBrowser.openBrowserAsync(site.href)}
      >
        <Globe size={16} color={colors.white} />
        <Text style={styles.webText}>{site.isDirectSite ? "Visit website" : "Find online"}</Text>
      </Pressable>

      {lawyer.user_id ? (
        <Pressable
          style={styles.message}
          disabled={messaging}
          onPress={async () => {
            if (!user) {
              router.push("/(auth)/login");
              return;
            }
            setMsgError("");
            setMessaging(true);
            const { conversationId, error } = await getOrCreateDirectConversation(user.id, lawyer.user_id!);
            setMessaging(false);
            if (!conversationId) {
              setMsgError(error || "Could not start conversation.");
              return;
            }
            router.push(`/messages/${conversationId}`);
          }}
        >
          <MessageSquare size={16} color={colors.navy} />
          <Text style={styles.messageText}>{messaging ? "Opening…" : user ? "Message" : "Sign in to message"}</Text>
        </Pressable>
      ) : (
        <Text style={styles.disclaimer}>Messaging isn’t available for this listing — use Visit website.</Text>
      )}

      <Text style={styles.disclaimer}>
        General info only — not legal advice. Online booking is coming soon.
      </Text>
    </ScrollView>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.section}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, backgroundColor: colors.bg, paddingBottom: 48 },
  hero: { alignItems: "center", gap: 6 },
  avatar: {
    height: 72, width: 72, borderRadius: 20, backgroundColor: colors.goldSoft,
    alignItems: "center", justifyContent: "center",
  },
  initials: { fontSize: 22, fontWeight: "800", color: colors.navy },
  name: { fontSize: 24, fontWeight: "800", color: colors.navy, textAlign: "center" },
  firm: { color: colors.muted, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { color: colors.muted, fontSize: font.small },
  verified: { color: colors.success, fontWeight: "800", fontSize: font.tiny },
  save: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  saveText: { fontWeight: "800", color: colors.navy },
  section: { fontSize: font.tiny, fontWeight: "800", color: colors.gold, letterSpacing: 0.6, textTransform: "uppercase" },
  body: { color: colors.text, lineHeight: 22, fontSize: font.body },
  web: {
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.navy, minHeight: 48, borderRadius: radius.md,
  },
  webText: { color: colors.white, fontWeight: "800" },
  message: {
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
    minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  messageText: { color: colors.navy, fontWeight: "800" },
  disclaimer: { color: colors.muted, fontSize: font.tiny, lineHeight: 18, textAlign: "center" },
});
