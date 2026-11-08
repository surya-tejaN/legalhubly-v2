import { Pressable, StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import type { LawyerListItem } from "@/lib/lawyers";
import { colors, font, radius, space } from "@/theme";

export function LawyerCard({
  lawyer,
  onPress,
}: {
  lawyer: LawyerListItem;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{lawyer.avatar_initials || lawyer.name.slice(0, 2)}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{lawyer.name}</Text>
          {lawyer.verified ? <Text style={styles.verified}>Verified</Text> : null}
        </View>
        <Text style={styles.firm} numberOfLines={1}>{lawyer.firm}</Text>
        <View style={styles.row}>
          <Star size={13} color={colors.gold} fill={colors.gold} />
          <Text style={styles.meta}>
            {(lawyer.rating || 0).toFixed(1)} · {lawyer.review_count || 0} reviews · {lawyer.experience_years}+ yrs
          </Text>
        </View>
        <Text style={styles.areas} numberOfLines={1}>
          {(lawyer.practice_areas || []).slice(0, 3).join(" · ")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    height: 56,
    width: 56,
    borderRadius: radius.md,
    backgroundColor: colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: colors.navy, fontWeight: "800", fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flex: 1, fontSize: font.body, fontWeight: "700", color: colors.text },
  verified: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.success,
    backgroundColor: "#E8F7EE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  firm: { color: colors.muted, fontSize: font.small },
  meta: { color: colors.muted, fontSize: font.tiny },
  areas: { color: colors.navy, fontSize: font.tiny, fontWeight: "600" },
});
