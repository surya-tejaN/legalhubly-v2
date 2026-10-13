import { Navigate } from "react-router-dom";
import { useAuth, useDashboardPath, type AppRole } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, profile, loading } = useAuth();
  const fallback = useDashboardPath(profile?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wait for profile before enforcing roles — avoid open window while profile is null
  if (allowedRoles && !profile) {
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
