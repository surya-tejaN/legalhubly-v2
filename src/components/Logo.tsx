import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Show full lockup (mark + wordmark image) */
  withWordmark?: boolean;
  /** Soft ivory plate behind mark on dark navy backgrounds */
  onDark?: boolean;
  wordmarkClassName?: string;
};

/** Exact Option-4 LH monogram mark (transparent PNG). */
export function LogoMark({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <img
      src="/brand/logo-mark.png"
      alt=""
      width={36}
      height={36}
      className={cn(
        "shrink-0 object-contain",
        onDark && "rounded-[10px] bg-[#F7F3EB] p-1",
        className,
      )}
      aria-hidden
    />
  );
}

/** Exact Option-4 brand logo — approved lockup image. */
export default function Logo({ className, withWordmark = false, onDark = false, wordmarkClassName }: Props) {
  if (withWordmark) {
    return (
      <img
        src="/brand/logo-lockup.png"
        alt="Legalhubly"
        className={cn(
          "h-9 w-auto max-w-[210px] object-contain object-left",
          onDark && "rounded-md bg-[#F7F3EB]/90 px-2 py-1",
          className,
          wordmarkClassName,
        )}
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>
      <LogoMark className="h-9 w-9" onDark={onDark} />
    </span>
  );
}
