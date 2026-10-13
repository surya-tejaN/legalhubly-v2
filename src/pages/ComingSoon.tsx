import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";
import { useAuth, useDashboardPath } from "@/contexts/AuthContext";

/** Shown for beta routes that are not production-ready yet. */
export default function ComingSoon() {
  const { profile } = useAuth();
  const dashboard = useDashboardPath(profile?.role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <Construction className="h-10 w-10 text-accent mx-auto" />
        <h1 className="font-serif text-2xl font-bold text-foreground">Coming soon</h1>
        <p className="text-sm text-muted-foreground">
          This module is being rebuilt for production scale. It is not available yet.
        </p>
        <Button asChild>
          <Link to={dashboard}>Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
