import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { Button, Screen } from "@/components/ui";
import { colors, font, space } from "@/theme";

export default function AccountScreen() {
  const { user, profile, signOut } = useAuth();

  if (!user) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.title}>Your Legalhubly account</Text>
        <Text style={styles.body}>One login for the website and this app.</Text>
        <View style={{ width: "100%", paddingHorizontal: 24, gap: 10 }}>
          <Button label="Sign in" onPress={() => router.push("/(auth)/login")} />
          <Button label="Create account" onPress={() => router.push("/(auth)/signup")} variant="ghost" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.pad}>
      <Text style={styles.kicker}>Signed in</Text>
      <Text style={styles.title}>{profile?.full_name || "Member"}</Text>
      <Text style={styles.body}>{user.email}</Text>
      <Text style={styles.role}>{(profile?.role || "client").replaceAll("_", " ")} · {profile?.city || "Chicago"}</Text>
      <Button label="Messages" onPress={() => router.push("/messages")} />
      <Button label="Saved lawyers" onPress={() => router.push("/(tabs)/saved")} variant="ghost" />
      <Button label="Sign out" onPress={() => void signOut()} variant="ghost" />
      <Pressable onPress={() => Linking.openURL("https://www.legalhubly.com/privacy")}>
        <Text style={styles.link}>Privacy</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL("https://www.legalhubly.com")}>
        <Text style={styles.link}>Open the website</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center", gap: 12, padding: space.lg },
  pad: { padding: space.lg, gap: 10 },
  kicker: { color: colors.gold, fontWeight: "800", letterSpacing: 1, fontSize: font.tiny },
  title: { fontSize: font.title, fontWeight: "800", color: colors.navy },
  body: { color: colors.muted, fontSize: font.body },
  role: { color: colors.text, fontWeight: "700", textTransform: "capitalize", marginBottom: 12 },
  link: { color: colors.navy, fontWeight: "700", marginTop: 8 },
});
