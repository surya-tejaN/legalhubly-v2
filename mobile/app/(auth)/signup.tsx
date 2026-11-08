import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { generateEmailOtp, verifyEmailOtp } from "@/lib/otp";
import { Banner, Button, Field, Screen } from "@/components/ui";
import { colors, font, radius, space } from "@/theme";
import type { AppRole } from "@/providers/AuthProvider";

function passwordOk(pw: string) {
  return (
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("client");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const pendingRef = useRef({ email: "", password: "" });

  const sendOtp = async (uid: string, addr: string) => {
    const result = await generateEmailOtp(uid, addr);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setInfo("We sent a 6-digit code to your email.");
    return true;
  };

  const onSubmit = async () => {
    setError("");
    setInfo("");
    if (!name.trim() || !email.trim() || !password) {
      setError("Fill in name, email, and password.");
      return;
    }
    if (!passwordOk(password)) {
      setError("Use 8+ characters with upper, lower, a number, and a symbol.");
      return;
    }
    setBusy(true);
    await AsyncStorage.setItem("signup_intended_role", role);
    const trimmedEmail = email.trim().toLowerCase();
    const { data, error: err } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { full_name: name.trim(), role, city: "Chicago" },
      },
    });
    if (err) {
      setBusy(false);
      setError(err.message.includes("already") ? "This email is already registered. Sign in instead." : err.message);
      return;
    }
    if (!data.user) {
      setBusy(false);
      setError("Could not create account. Please try again.");
      return;
    }
    if (data.user.identities && data.user.identities.length === 0) {
      setBusy(false);
      setError("This email is already registered. Sign in or reset your password.");
      return;
    }
    pendingRef.current = { email: trimmedEmail, password };
    setUserId(data.user.id);
    setStep("otp");
    if (data.session) await supabase.auth.signOut({ scope: "local" });
    if (role === "lawyer") {
      // Role is applied after verified sign-in via website/app session.
      await AsyncStorage.setItem("signup_intended_role", "lawyer");
    }
    const sent = await sendOtp(data.user.id, trimmedEmail);
    if (!sent) setInfo("Account created. Tap Resend if the email did not arrive.");
    setBusy(false);
  };

  const onVerify = async () => {
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await verifyEmailOtp(pendingRef.current.email, otp);
    if (!result.success || !result.verified) {
      setBusy(false);
      setError(result.error || "Invalid code. Try again.");
      setOtp("");
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: pendingRef.current.email,
      password: pendingRef.current.password,
    });
    if (signInError) {
      setBusy(false);
      setError("Email verified. Please sign in.");
      return;
    }
    if (role === "lawyer") {
      await supabase.rpc("apply_signup_role", { requested: "lawyer" });
    }
    setBusy(false);
  };

  if (step === "otp") {
    return (
      <Screen>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.sub}>Enter the 6-digit code we sent to {pendingRef.current.email}</Text>
          {error ? <Banner text={error} /> : null}
          {info ? <Banner text={info} tone="muted" /> : null}
          <Field
            label="Verification code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
          />
          <Button label="Verify" onPress={() => void onVerify()} loading={busy} />
          <Button
            label="Resend code"
            variant="ghost"
            onPress={() => void sendOtp(userId, pendingRef.current.email)}
            disabled={busy || !userId}
          />
          <Pressable onPress={() => { setStep("form"); setOtp(""); setError(""); }}>
            <Text style={styles.link}>Edit email</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.sub}>Same Legalhubly account as the website.</Text>
        {error ? <Banner text={error} /> : null}
        {info ? <Banner text={info} tone="muted" /> : null}
        <View style={styles.roles}>
          {(["client", "lawyer"] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[styles.role, role === r && styles.roleOn]}
            >
              <Text style={[styles.roleText, role === r && { color: colors.navy }]}>
                {r === "client" ? "I need a lawyer" : "I am a lawyer"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Text style={styles.hint}>8+ characters, upper, lower, number, and a symbol.</Text>
        <Button label="Create account" onPress={() => void onSubmit()} loading={busy} />
        <Link href="/(auth)/login">
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </Link>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.lg, justifyContent: "center", gap: space.md },
  title: { fontSize: font.title, fontWeight: "800", color: colors.navy },
  sub: { fontSize: font.small, color: colors.muted, marginBottom: 4 },
  hint: { fontSize: font.tiny, color: colors.muted },
  roles: { flexDirection: "row", gap: 8 },
  role: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.card,
  },
  roleOn: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  roleText: { textAlign: "center", fontWeight: "700", color: colors.muted, fontSize: font.small },
  link: { color: colors.navy, fontWeight: "700", fontSize: font.small, textAlign: "center" },
});
