import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Banner, Button, Field, Screen } from "@/components/ui";
import { colors, font, space } from "@/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (err) setError(err.message);
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Text style={styles.mark}>LH</Text>
        <Text style={styles.title}>Legalhubly</Text>
        <Text style={styles.sub}>Chicago lawyers · Describe → Match → Connect</Text>
        {error ? <Banner text={error} /> : null}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />
        <Button label="Sign in" onPress={onSubmit} loading={busy} />
        <View style={{ alignItems: "center", marginTop: 8, gap: 10 }}>
          <Link href="/(auth)/forgot-password">
            <Text style={styles.link}>Forgot password?</Text>
          </Link>
          <Link href="/(auth)/signup">
            <Text style={styles.link}>New here? Create a free account</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.lg, justifyContent: "center", gap: space.md },
  mark: {
    alignSelf: "center",
    fontSize: 22,
    fontWeight: "800",
    color: colors.navy,
    backgroundColor: colors.gold,
    width: 56,
    height: 56,
    textAlign: "center",
    lineHeight: 56,
    borderRadius: 14,
    overflow: "hidden",
  },
  title: { fontSize: font.title, fontWeight: "800", color: colors.navy, textAlign: "center" },
  sub: { fontSize: font.small, color: colors.muted, textAlign: "center", marginBottom: 8 },
  link: { color: colors.navy, fontWeight: "700", fontSize: font.small },
});
