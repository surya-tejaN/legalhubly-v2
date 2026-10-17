import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth, useDashboardPath } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { matchPracticeAreas } from "@/lib/practiceAreas";
import { setPageMeta } from "@/lib/pageMeta";
import { LAUNCH_CITY_LABEL } from "@/lib/location";
import { shareLegalhubly } from "@/lib/shareReferral";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import {
  Shield, ArrowRight, Sparkles, MapPin, Briefcase,
  Menu, X, Star, Clock, BadgeCheck, Search,
  Users, Home, Gavel, Globe, Heart, Building2,
  Landmark, ScrollText, ChevronRight, DollarSign, Brain,
  Stethoscope, ShieldCheck, Car, KeyRound, GraduationCap,
  Leaf, Swords, Earth, Receipt, Zap, Share2,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Find Lawyer", href: "/client/find-lawyers" },
  { label: "Practice Areas", href: "#practice-areas" },
  { label: "How It Works", href: "#how" },
];

const CATEGORIES = [
  { label: "Immigration", practice: "Immigration Law", icon: Globe, desc: "Visas, green cards, asylum" },
  { label: "Divorce & Family", practice: "Family Law", icon: Heart, desc: "Custody, support, adoption" },
  { label: "Criminal Defense", practice: "Criminal Defense", icon: Gavel, desc: "DUI, felony, misdemeanor" },
  { label: "Personal Injury", practice: "Personal Injury", icon: Shield, desc: "Accidents, malpractice" },
  { label: "Employment Law", practice: "Employment Law", icon: Users, desc: "Wrongful termination, discrimination" },
  { label: "Business Law", practice: "Business Law", icon: Building2, desc: "Contracts, formation, disputes" },
  { label: "Real Estate", practice: "Real Estate Law", icon: Home, desc: "Purchase, lease, zoning" },
  { label: "Estate Planning", practice: "Estate Planning", icon: ScrollText, desc: "Wills, trusts, probate" },
  { label: "Civil Litigation", practice: "Civil Litigation", icon: Landmark, desc: "Lawsuits, appeals, mediation" },
  { label: "Bankruptcy", practice: "Bankruptcy", icon: DollarSign, desc: "Debt relief, Chapter 7 & 13" },
  { label: "Tax Law", practice: "Tax Law", icon: Receipt, desc: "IRS disputes, tax planning" },
  { label: "Intellectual Property", practice: "Intellectual Property", icon: Brain, desc: "Patents, trademarks, copyright" },
  { label: "Medical Malpractice", practice: "Medical Malpractice", icon: Stethoscope, desc: "Negligence, surgical errors" },
  { label: "Consumer Protection", practice: "Consumer Protection", icon: ShieldCheck, desc: "Fraud, warranties, recalls" },
  { label: "Traffic Violations", practice: "Traffic Violations", icon: Car, desc: "Tickets, DUI, license issues" },
  { label: "Landlord / Tenant", practice: "Landlord Tenant", icon: KeyRound, desc: "Eviction, leases, deposits" },
  { label: "Education Law", practice: "Education Law", icon: GraduationCap, desc: "Student rights, IEP, Title IX" },
  { label: "Environmental Law", practice: "Environmental Law", icon: Leaf, desc: "Compliance, pollution, permits" },
  { label: "Military Law", practice: "Military Law", icon: Swords, desc: "Court-martial, VA benefits" },
  { label: "International Law", practice: "International Law", icon: Earth, desc: "Trade, treaties, cross-border" },
];

const defaultTrustPoints = [
  { icon: BadgeCheck, value: "—", label: "Verified Lawyers" },
  { icon: Star, value: "—", label: "Avg Lawyer Rating" },
  { icon: Clock, value: "—", label: "Avg Response Time" },
  { icon: Shield, value: "Free", label: "To Get Started" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6 },
};

const staggerChild = (i: number) => ({
  transition: { duration: 0.5, delay: i * 0.06 },
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function Index() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const dashboardPath = useDashboardPath(profile?.role);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [issueInput, setIssueInput] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [trustPoints, setTrustPoints] = useState(defaultTrustPoints);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setPageMeta({
      title: "Legalhubly — Find the Right Chicago Lawyer Faster",
      description:
        "Legalhubly is the AI-powered legal marketplace for Chicago. Describe your issue, get matched to verified lawyers instantly, then connect — free to start.",
      path: "/",
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, count, error } = await supabase
        .from("lawyers")
        .select("rating, avg_response_hours, verified", { count: "exact" })
        .eq("city", "Chicago");
      if (!active) return;
      if (error || !data) {
        setTrustPoints(defaultTrustPoints);
        return;
      }
      const total = count ?? data.length;
      const verified = data.filter((l) => l.verified).length;
      const avgRating =
        data.length > 0
          ? data.reduce((sum, l) => sum + (Number(l.rating) || 0), 0) / data.length
          : 0;
      const avgHours =
        data.length > 0
          ? data.reduce((sum, l) => sum + (Number(l.avg_response_hours) || 0), 0) / data.length
          : 0;
      setTrustPoints([
        { icon: BadgeCheck, value: String(verified), label: "Verified Lawyers" },
        { icon: Star, value: avgRating ? `${avgRating.toFixed(1)}★` : "—", label: "Avg Lawyer Rating" },
        {
          icon: Clock,
          value: avgHours ? `~${avgHours < 1 ? "<1" : Math.round(avgHours)}hr` : "—",
          label: "Avg Response Time",
        },
        { icon: MapPin, value: String(total), label: "Chicago Lawyers" },
      ]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSmartMatch = () => {
    const trimmed = issueInput.trim();
    if (!trimmed) {
      navigate("/client/find-lawyers");
      return;
    }
    const matched = matchPracticeAreas(trimmed);
    const params = new URLSearchParams();
    params.set("q", trimmed);
    params.set("sort", "best_match");
    if (matched.length > 0) {
      // Prefer a single primary area so directory filter stays clean
      params.set("matched", matched[0]);
    }
    navigate(`/client/find-lawyers?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ═══ NAVIGATION ═══ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "glass-nav border-b border-border/50 shadow-card" : "bg-transparent"}`}>
        <div className="container flex items-center justify-between h-[72px]">
          <Link to="/" className="group">
            <Logo withWordmark wordmarkClassName="group-hover:opacity-90 transition-opacity" />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              link.href.startsWith("#") ? (
                <a key={link.label} href={link.href} className="px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all duration-200">
                  {link.label}
                </a>
              ) : (
                <Link key={link.label} to={link.href} className="px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all duration-200">
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={dashboardPath}>Dashboard</Link>
                </Button>
                <Link to={dashboardPath} className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center hover:bg-accent/25 transition-colors overflow-hidden">
                  {profile?.profile_photo || profile?.avatar_url ? (
                    <img src={profile.profile_photo || profile.avatar_url || ""} className="h-9 w-9 rounded-full object-cover" alt="" />
                  ) : (
                    <span className="text-xs font-bold text-accent">
                      {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
                <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }} className="text-muted-foreground">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button variant="nav-gold" size="sm" asChild>
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden border-t bg-background"
            >
              <div className="container py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  link.href.startsWith("#") ? (
                    <a key={link.label} href={link.href} className="block py-3 px-3 text-sm font-medium text-foreground rounded-lg hover:bg-muted/50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.label} to={link.href} className="block py-3 px-3 text-sm font-medium text-foreground rounded-lg hover:bg-muted/50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                      {link.label}
                    </Link>
                  )
                ))}
                <div className="pt-4 border-t mt-3 space-y-2">
                  {user ? (
                    <>
                      <Button variant="gold" className="w-full" asChild>
                        <Link to={dashboardPath} onClick={() => setMobileMenuOpen(false)}>Go to Dashboard</Link>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={async () => { setMobileMenuOpen(false); await signOut(); navigate("/"); }}>
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                      </Button>
                      <Button variant="gold" className="w-full" asChild>
                        <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(42 78% 55% / 0.06), transparent)" }} />

        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/6 border border-accent/12 text-accent text-[12px] font-semibold mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Legal Matching
            </div>
            <h1 className="text-[2.5rem] md:text-[3.75rem] font-serif leading-[1.08] tracking-tight text-foreground mb-5">
              Legalh<span className="text-accent">u</span>bly — find the right lawyer{" "}
              <span className="text-gradient-gold">faster</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed mb-10">
              Chicago’s AI legal marketplace. Describe your issue, get matched, connect with verified lawyers — free to start.
            </p>
          </motion.div>

          {/* Smart Match Input */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-xl mx-auto"
          >
            <div className="bg-card rounded-2xl border shadow-elevated p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-background border border-border/60 focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
                  <Search className="h-5 w-5 text-accent shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={issueInput}
                    onChange={(e) => setIssueInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSmartMatch(); }}
                    placeholder="Describe your legal issue (e.g., visa, divorce, accident...)"
                    className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60 min-w-0"
                    autoFocus
                  />
                  {issueInput && (
                    <button onClick={() => { setIssueInput(""); inputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="gold"
                  size="lg"
                  onClick={() => handleSmartMatch()}
                  className="shrink-0 px-6 gap-2"
                >
                  <Zap className="h-4 w-4" />
                  <span className="hidden md:inline">Smart Match</span>
                  <span className="md:hidden">Match</span>
                </Button>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent/60" />
              AI-powered matching · Chicago lawyers · Free to search
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section className="py-10 border-y border-border/50 bg-muted/20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustPoints.map((t, i) => (
              <motion.div key={t.label} {...fadeUp} {...staggerChild(i)} className="flex items-center gap-3 justify-center md:justify-start">
                <div className="h-10 w-10 rounded-xl bg-accent/8 flex items-center justify-center shrink-0">
                  <t.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-xl font-serif text-foreground leading-none">{t.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRACTICE AREAS BROWSE ═══ */}
      <section id="practice-areas" className="py-24 md:py-32">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-16 max-w-lg mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent mb-3 block">Practice Areas</span>
            <h2 className="text-3xl md:text-[2.75rem] font-serif text-foreground leading-tight mb-4">Browse by legal category</h2>
            <p className="text-muted-foreground text-lg">Select a practice area to find specialized Chicago attorneys ({LAUNCH_CITY_LABEL}).</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {CATEGORIES.map((cat, i) => (
              <motion.div key={cat.label} {...fadeUp} {...staggerChild(i)}>
                <Link
                  to={`/client/find-lawyers?matched=${encodeURIComponent(cat.practice)}`}
                  className="group flex items-center gap-4 p-6 rounded-2xl bg-card border border-border/60 shadow-card hover:shadow-card-hover hover:border-accent/20 transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-accent/8 flex items-center justify-center shrink-0 group-hover:bg-accent/12 group-hover:scale-105 transition-all duration-300">
                    <cat.icon className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">{cat.label}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{cat.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent shrink-0 transition-all duration-300" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-24 md:py-32 bg-muted/20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-16 max-w-lg mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent mb-3 block">How It Works</span>
            <h2 className="text-3xl md:text-[2.75rem] font-serif text-foreground leading-tight mb-4">Three steps to the right lawyer</h2>
            <p className="text-muted-foreground text-lg">Simple, fast, and completely free to start.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", icon: Search, title: "Describe your issue", desc: "Tell us about your legal situation in plain language. No jargon needed." },
              { step: "02", icon: Zap, title: "AI matches you instantly", desc: "Our algorithm identifies the best practice area and finds top-rated lawyers." },
              { step: "03", icon: Sparkles, title: "Connect with your lawyer", desc: "View profiles, compare ratings, and visit their website to get started." },
            ].map((s, i) => (
              <motion.div key={s.step} {...fadeUp} {...staggerChild(i)}
                className="relative text-center p-10 rounded-2xl bg-card border border-border/60 shadow-card hover:shadow-card-hover transition-all duration-300"
              >
                <span className="absolute top-5 right-6 text-[3rem] font-serif text-accent/8 leading-none">{s.step}</span>
                <div className="h-16 w-16 rounded-2xl bg-accent/8 flex items-center justify-center mx-auto mb-6">
                  <s.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 md:py-32">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center p-12 md:p-20 rounded-3xl hero-gradient relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 25% 40%, hsl(42 78% 55%), transparent 50%), radial-gradient(circle at 75% 70%, hsl(42 78% 55%), transparent 40%)" }} />
            <div className="relative">
              <h2 className="text-3xl md:text-[2.75rem] font-serif text-primary-foreground leading-tight mb-5">
                Ready to find your lawyer?
              </h2>
              <p className="text-primary-foreground/60 text-lg mb-10 max-w-md mx-auto">
                It's free to search and get matched. Find your attorney in minutes.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="gold" size="lg" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => inputRef.current?.focus(), 500); }}>
                  Get Started Free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={async () => {
                    const result = await shareLegalhubly({
                      text: "Find the right Chicago lawyer faster on Legalhubly — free to start.",
                      path: "/",
                    });
                    if (result === "copied") toast.success("Link copied — share with friends & family.");
                    if (result === "failed") toast.error("Could not share right now.");
                  }}
                >
                  <Share2 className="mr-1.5 h-4 w-4" /> Share Legalhubly
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t bg-card/30 pt-16 pb-8">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="inline-flex mb-4">
                <Logo withWordmark wordmarkClassName="text-lg" />
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                AI-powered legal marketplace connecting clients with verified attorneys.
              </p>
            </div>
            {[
              { title: "Platform", links: [{ label: "Find a Lawyer", href: "/client/find-lawyers" }, { label: "Practice Areas", href: "#practice-areas" }, { label: "How It Works", href: "#how" }] },
              { title: "Resources", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }] },
              {
                title: "Company",
                links: [
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "LinkedIn", href: "https://www.linkedin.com/company/legalhubly", external: true },
                  { label: "Contact", href: "/contact" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : link.href.startsWith("#") ? (
                        <a href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
                      ) : (
                        <Link to={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 Legalhubly. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/company/legalhubly"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                LinkedIn
              </a>
              <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
