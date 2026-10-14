import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Show wordmark next to the mark */
  withWordmark?: boolean;
  /** Invert colors for dark navy backgrounds */
  onDark?: boolean;
  wordmarkClassName?: string;
};

/**
 * Legalhubly brand mark — original geometric L + balance beam.
 * SVG scales cleanly for favicon, nav, and marketing.
 */
export function LogoMark({ className, onDark }: { className?: string; onDark?: boolean }) {
  const navy = onDark ? "#F7F4EE" : "#0B1F33";
  const gold = "#C9A227";

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {/* Outer soft square */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill={onDark ? "rgba(201,162,39,0.12)" : "rgba(11,31,51,0.04)"} />
      {/* Vertical L stem */}
      <path
        d="M22 14v32c0 1.1.9 2 2 2h18"
        stroke={navy}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Balance beam */}
      <path d="M18 28h28" stroke={gold} strokeWidth="4" strokeLinecap="round" />
      {/* Fulcrum diamond */}
      <path d="M32 22l4 6-4 6-4-6 4-6z" fill={gold} />
      {/* Left pan */}
      <path d="M18 28c0 5 3.5 9 7 9" stroke={navy} strokeWidth="3" strokeLinecap="round" />
      {/* Right pan */}
      <path d="M46 28c0 5-3.5 9-7 9" stroke={navy} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ className, withWordmark = false, onDark = false, wordmarkClassName }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8" onDark={onDark} />
      {withWordmark && (
        <span
          className={cn(
            "font-serif text-xl tracking-tight leading-none",
            onDark ? "text-primary-foreground" : "text-foreground",
            wordmarkClassName,
          )}
        >
          Legalhubly
        </span>
      )}
    </span>
  );
}
