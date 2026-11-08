import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Banner, Button, Field, Screen } from "@/components/ui";
import { colors, font, space } from "@/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter the email on your Legalhubly account.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: "https://www.legalhubly.com/reset-password",
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.sub}>
          {sent
            ? "Check your email for a reset link. It opens the Legalhubly website to set a new password."
            : "We’ll email a reset link. Same account as the website."}
        </Text>
        {error ? <Banner text={error} /> : null}
        {!sent ? (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
            />
            <Button label="Send reset link" onPress={() => void onSubmit()} loading={busy} />
          </>
        ) : null}
        <Link href="/(auth)/login">
          <Text style={styles.link}>Back to sign in</Text>
        </Link>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.lg, justifyContent: "center", gap: space.md },
  title: { fontSize: font.title, fontWeight: "800", color: colors.navy },
  sub: { fontSize: font.small, color: colors.muted, marginBottom: 4, lineHeight: 20 },
  link: { color: colors.navy, fontWeight: "700", fontSize: font.small, textAlign: "center" },
});
