import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

/** Shared chrome for public marketing/legal pages on phone and desktop. */
export default function PublicPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background pt-[env(safe-area-inset-top)]">
      <div className="container max-w-3xl py-10 sm:py-16 space-y-8">
        <Link to="/" className="inline-flex items-center min-h-11">
          <Logo withWordmark wordmarkClassName="text-xl font-bold" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground mt-2">{subtitle}</p> : null}
        </div>
        {children}
        <Link to="/" className="inline-flex items-center min-h-11 text-sm text-accent hover:underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
