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
 * Legalhubly LH monogram — letters as pillars + gold balance beam.
 * SVG scales cleanly for favicon, nav, and marketing.
 */
export function LogoMark({ className, onDark }: { className?: string; onDark?: boolean }) {
  const ink = onDark ? "#F7F4EE" : "#0B1F3A";
  const gold = "#C4A35A";

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="14"
        fill={onDark ? "rgba(196,163,90,0.14)" : "rgba(11,31,58,0.05)"}
      />
      {/* Serif L */}
      <path
        fill={ink}
        d="M14 14h7.2v28.2H36v6.4H14c-1.2 0-2.2-1-2.2-2.2V16.2c0-1.2 1-2.2 2.2-2.2z"
      />
      {/* Serif H (interlocks with L) */}
      <path
        fill={ink}
        d="M30.5 18h6.8v10.2h10.2V18H54v28.5h-6.5V36.2H37.3v10.3h-6.8V18z"
      />
      {/* Gold balance beam + fulcrum on H */}
      <path d="M33 16.5h24" stroke={gold} strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="45" cy="16.5" r="2.2" fill={gold} />
      <path d="M33 16.5v5.5c0 1.6 1.4 2.8 3 2.8" stroke={gold} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M57 16.5v5.5c0 1.6-1.4 2.8-3 2.8" stroke={gold} strokeWidth="1.8" strokeLinecap="round" />
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
          Legalh
          <span className={cn(onDark ? "text-accent" : "text-[#C4A35A]")}>u</span>
          bly
        </span>
      )}
    </span>
  );
}
