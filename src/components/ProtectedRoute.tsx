import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth, useDashboardPath, type AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { safeInternalPath } from "@/lib/safeRedirect";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();
  const fallback = useDashboardPath(profile?.role);
  const [profileWaitMs, setProfileWaitMs] = useState(0);

  useEffect(() => {
    if (!user || !allowedRoles || profile) {
      setProfileWaitMs(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => setProfileWaitMs(Date.now() - started), 500);
    return () => window.clearInterval(id);
  }, [user, allowedRoles, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    const from = safeInternalPath(`${location.pathname}${location.search}`, "/");
    const q = from !== "/" ? `?from=${encodeURIComponent(from)}` : "";
    return <Navigate to={`/login${q}`} replace />;
  }

  // Wait for profile before enforcing roles — escape after 8s if row missing
  if (allowedRoles && !profile) {
    if (profileWaitMs > 8000) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 px-4 text-center">
          <p className="text-sm text-foreground font-medium">We couldn’t load your profile.</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Your account may still be finishing setup. Try again, or contact support.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link to="/contact">Contact</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-3 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      </div>
    );
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
