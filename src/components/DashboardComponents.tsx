import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export function StatCard({ icon, label, value, change, changeType = "neutral" }: StatCardProps) {
  return (
    <div className="group p-5 rounded-2xl bg-card border shadow-card hover-lift border-glow">
      <div className="flex items-center justify-between mb-4">
        <div className="h-11 w-11 rounded-xl bg-accent/8 flex items-center justify-center transition-colors group-hover:bg-accent/12">
          {icon}
        </div>
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg",
              changeType === "positive" && "bg-success/8 text-success",
              changeType === "negative" && "bg-destructive/8 text-destructive",
              changeType === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
            {changeType === "negative" && <TrendingDown className="h-3 w-3" />}
            {changeType === "neutral" && <Minus className="h-3 w-3" />}
            {change}
          </span>
        )}
      </div>
      <div className="text-[1.75rem] font-bold text-foreground tracking-tight leading-none">{value}</div>
      <div className="text-[13px] text-muted-foreground mt-1.5 font-medium">{label}</div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl md:text-[2rem] font-serif text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1.5 text-[15px]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
}

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide",
        variant === "default" && "bg-muted text-muted-foreground",
        variant === "success" && "bg-success/8 text-success",
        variant === "warning" && "bg-warning/8 text-warning",
        variant === "destructive" && "bg-destructive/8 text-destructive",
        variant === "info" && "bg-info/8 text-info"
      )}
    >
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        variant === "default" && "bg-muted-foreground",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
        variant === "destructive" && "bg-destructive",
        variant === "info" && "bg-info"
      )} />
      {status}
    </span>
  );
}
