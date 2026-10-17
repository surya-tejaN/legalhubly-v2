import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useDashboardPath } from "@/contexts/AuthContext";
import { setRememberPreference } from "@/lib/authStorage";
import { consumeOAuthRedirectError, startOAuthLogin } from "@/lib/oauth";
import { isFeatureEnabled } from "@/config/features";
import { safeInternalPath } from "@/lib/safeRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";

export default function Login() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const dashboardPath = useDashboardPath(profile?.role);
  const postLoginPath = safeInternalPath(searchParams.get("from"), dashboardPath);
  const showOAuth = isFeatureEnabled("authGoogleApple");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [profileWaitMs, setProfileWaitMs] = useState(0);

  useEffect(() => {
    const oauthErr = consumeOAuthRedirectError();
    if (oauthErr) setErrorMsg(oauthErr);
  }, []);

  useEffect(() => {
    document.title = "Sign in | Legalhubly";
    let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (!user || profile || loading) {
      setProfileWaitMs(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setProfileWaitMs(Date.now() - started), 500);
    return () => window.clearInterval(id);
  }, [user, profile, loading]);

  // Wait for profile so lawyer/admin don't flash into client dashboard
  if (!loading && user && profile) {
    const dest =
      postLoginPath.startsWith("/client") ||
      postLoginPath.startsWith("/lawyer") ||
      postLoginPath.startsWith("/firm") ||
      postLoginPath.startsWith("/admin")
        ? postLoginPath
        : dashboardPath;
    return <Navigate to={dest} replace />;
  }
  if (!loading && user && !profile) {
    if (profileWaitMs > 8000) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-4 text-center">
          <p className="text-sm font-medium text-foreground">We couldn’t load your profile.</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your account may still be finishing setup. Retry, or sign out and try again.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button type="button" variant="outline" onClick={() => void refreshProfile()}>
              Retry
            </Button>
            <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      </div>
    );
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setErrorMsg("");
    setSubmitting(true);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorMsg("Please enter your email and password.");
      setSubmitting(false);
      return;
    }

    setRememberPreference(rememberMe);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("Invalid email or password. Please try again or reset your password.");
      } else if (error.message.includes("Email not confirmed")) {
        setErrorMsg("Please verify your email with the 6-digit code we sent, then sign in. Or sign up again to resend a code.");
      } else if (
        error.status === 429 ||
        error.message.toLowerCase().includes("rate") ||
        error.message.toLowerCase().includes("too many")
      ) {
        setCooldown(60);
        setErrorMsg("Too many attempts. Please wait a minute, or reset your password.");
      } else {
        setErrorMsg(error.message);
      }
    }
    setSubmitting(false);
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setErrorMsg("");
    setSubmitting(true);
    setRememberPreference(rememberMe);
    const { error } = await startOAuthLogin(provider, "/login");
    if (error) {
      setErrorMsg(error);
      toast.error(error);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden px-12 py-12 text-primary-foreground">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 20%, hsl(var(--accent) / 0.35), transparent 50%), linear-gradient(160deg, hsl(222 35% 12%) 0%, hsl(222 40% 18%) 55%, hsl(35 45% 22%) 100%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />

        <Link to="/" className="relative z-10 inline-flex">
          <Logo withWordmark onDark wordmarkClassName="text-2xl tracking-tight" />
        </Link>

        <div className="relative z-10 space-y-6 max-w-md">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-accent">Secure access</p>
          <h2 className="font-serif text-4xl leading-tight">
            Your legal search,{" "}
            <span className="italic text-accent">protected</span>
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Sign in to message lawyers, manage consultations, and pick up where you left off.
          </p>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
              Encrypted sessions with PKCE auth
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent shrink-0" />
              Guideline-trained support chat after you sign in
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">© 2026 Legalhubly</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-7">
          <div className="text-center lg:text-left">
            <Link to="/" className="inline-flex lg:hidden mb-6">
              <Logo withWordmark wordmarkClassName="text-xl font-bold" />
            </Link>
            <h1 className="font-serif text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue to your dashboard
            </p>
          </div>

          {showOAuth && (
            <>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                  onClick={() => void handleOAuth("google")}
                  disabled={submitting || cooldown > 0}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                  onClick={() => void handleOAuth("apple")}
                  disabled={submitting || cooldown > 0}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </Button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pl-10 h-11"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                  required
                  maxLength={255}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-accent hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember me on this device
              </Label>
            </div>

            <Button type="submit" className="w-full h-11" disabled={submitting || cooldown > 0}>
              {cooldown > 0
                ? `Try again in ${cooldown}s`
                : submitting
                  ? "Signing in…"
                  : "Sign in"}
            </Button>
          </form>

          <p className="text-center lg:text-left text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-accent font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
