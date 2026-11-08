import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius, space } from "@/theme";

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={["top"]} {...rest}>
      {children}
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
}) {
  const bg =
    variant === "ghost" ? "transparent" : variant === "danger" ? colors.danger : colors.navy;
  const fg = variant === "ghost" ? colors.navy : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function Banner({ text, tone = "danger" }: { text: string; tone?: "danger" | "muted" }) {
  return (
    <View style={[styles.banner, tone === "muted" && { backgroundColor: colors.goldSoft }]}>
      <Text style={[styles.bannerText, tone === "muted" && { color: colors.navy }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  btn: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  btnText: { fontSize: font.body, fontWeight: "700" },
  label: { fontSize: font.small, fontWeight: "600", color: colors.muted },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: font.body,
  },
  empty: { padding: space.xl, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: font.h2, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptyBody: { fontSize: font.small, color: colors.muted, textAlign: "center", lineHeight: 20 },
  banner: {
    backgroundColor: "#FDECEC",
    padding: space.sm,
    borderRadius: radius.sm,
  },
  bannerText: { color: colors.danger, fontSize: font.small, textAlign: "center" },
});
