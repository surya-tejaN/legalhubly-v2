import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Scale, ChevronLeft, ChevronRight, Search, Menu, X, User, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";

interface SidebarItem {
  icon: ReactNode;
  label: string;
  to: string;
  badge?: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  portalLabel: string;
  userName?: string;
  userRole?: string;
}

export default function DashboardLayout({ children, sidebarItems, portalLabel, userName = "User", userRole = "Member" }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const location = useLocation();

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className={cn("h-[72px] flex items-center gap-3 border-b border-sidebar-border shrink-0", collapsed ? "px-3 justify-center" : "px-5")}>
        <div className="h-9 w-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
          <Scale className="h-5 w-5 text-accent" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-serif text-[17px] text-sidebar-accent-foreground tracking-tight block leading-tight">Legalhubly</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent/70">{portalLabel}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px] transition-colors">{item.icon}</span>
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && item.badge > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded-full min-w-[22px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="p-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/30">
              <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-sidebar-accent-foreground truncate">{userName}</div>
                <div className="text-[11px] text-sidebar-foreground/40">{userRole}</div>
              </div>
            </div>
          </div>
        )}
        <div className="p-2 flex flex-col gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all text-xs"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all text-xs"
          >
            {collapsed ? <Scale className="h-4 w-4" /> : <span>← Back to Home</span>}
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-sidebar shadow-elevated"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300 ease-in-out", collapsed ? "md:ml-[72px]" : "md:ml-[260px]")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-4 md:px-8 glass-nav border-b">
          <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-9 w-9" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 flex-1 max-w-lg bg-muted/60 rounded-xl px-4 py-2.5 border border-border/50 transition-colors focus-within:border-accent/30 focus-within:bg-card">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search lawyers..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <kbd className="hidden lg:inline-flex text-[10px] text-muted-foreground/50 bg-background/80 border px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
