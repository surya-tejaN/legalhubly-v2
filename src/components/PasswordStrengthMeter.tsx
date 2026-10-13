import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  password: string;
}

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(password: string) {
  return RULES.every((r) => r.test(password));
}

export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  return RULES.filter((r) => r.test(password)).length;
}

const STRENGTH_LABELS = ["", "Weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-muted",
  "bg-destructive",
  "bg-destructive",
  "bg-warning",
  "bg-accent",
  "bg-success",
];

export default function PasswordStrengthMeter({ password }: Props) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const results = useMemo(() => RULES.map((r) => ({ ...r, pass: r.test(password) })), [password]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i < strength ? STRENGTH_COLORS[strength] : "bg-muted"
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Password strength: <span className="font-medium text-foreground">{STRENGTH_LABELS[strength]}</span>
        </p>
      </div>

      {/* Rules checklist */}
      <ul className="space-y-1">
        {results.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            {r.pass ? (
              <Check className="h-3.5 w-3.5 text-success shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={r.pass ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
