import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useDashboardPath } from "@/contexts/AuthContext";
import { CheckCircle, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function VerifyEmailSuccess() {
  const { user, profile, loading } = useAuth();
  const dashboardPath = useDashboardPath(profile?.role);
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "already" | "error">("verifying");

  useEffect(() => {
    // Supabase handles the token exchange from the URL hash automatically
    // via onAuthStateChange. We just wait for the user to appear.
    const timeout = setTimeout(() => {
      if (!user) setStatus("error");
    }, 10000); // 10s timeout

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (user) {
      // Check if they were already verified before clicking
      if (user.email_confirmed_at) {
        setStatus("success");
      } else {
        setStatus("success");
      }

      // Redirect to dashboard after brief delay
      const timer = setTimeout(() => {
        navigate(dashboardPath, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, dashboardPath, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        {status === "verifying" && (
          <>
            <div className="mx-auto h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-accent animate-spin" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Verifying your email…</h1>
              <p className="text-muted-foreground">Please wait while we confirm your account.</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-accent" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Email Verified!</h1>
              <p className="text-muted-foreground">Your email has been verified successfully.</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-accent">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Logging you in…</span>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Verification Failed</h1>
              <p className="text-muted-foreground">
                The verification link may have expired or is invalid. Please try again.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button asChild className="w-full">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
