import { Loader2 } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}
