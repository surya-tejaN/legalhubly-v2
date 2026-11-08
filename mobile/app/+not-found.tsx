import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors, font } from "@/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn’t exist.</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Back to lawyers</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: colors.bg },
  title: { fontSize: font.h2, fontWeight: "800", color: colors.navy },
  link: { marginTop: 16, paddingVertical: 12 },
  linkText: { fontSize: font.body, fontWeight: "700", color: colors.navy },
});
