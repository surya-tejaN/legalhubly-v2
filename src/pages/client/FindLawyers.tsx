import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, MapPin, Shield, ArrowUpDown,
  Briefcase, Scale, ArrowLeft, ArrowRight,
  User, Building2, Award, Search, Info, Heart, Sparkles, ExternalLink, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lawyer {
  id: string;
  name: string;
  firm: string;
  avatar_initials: string;
  verified: boolean;
  practice_areas: string[];
  experience_years: number;
  city: string | null;
  state: string | null;
  languages: string[];
  avg_response_hours: number;
  availability_status: string;
  rating: number;
  review_count: number;
  bio: string | null;
  short_description: string | null;
  website_url: string | null;
  hourly_rate: number | null;
}

type SortKey = "rating" | "review_count" | "experience";

const SORT_OPTIONS: { value: SortKey; label: string; icon: typeof Star }[] = [
  { value: "rating", label: "Top Rated", icon: Star },
  { value: "experience", label: "Most Experienced", icon: Briefcase },
  { value: "review_count", label: "Most Reviewed", icon: Award },
];

// ─── Lawyer Card ─────────────────────────────────────────────────────────────

function LawyerCard({ lawyer, index, savedIds, onToggleSave }: { lawyer: Lawyer; index: number; savedIds: Set<string>; onToggleSave: (id: string) => void }) {
  const isSaved = savedIds.has(lawyer.id);
  const casesHandled = Math.round(lawyer.experience_years * 20 + lawyer.review_count * 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="rounded-2xl bg-card border border-border/60 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group"
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center text-accent text-2xl font-bold font-serif border border-accent/10">
                {lawyer.avatar_initials}
              </div>
              <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[2.5px] border-card ${
                lawyer.availability_status === "available" ? "bg-success" : lawyer.availability_status === "busy" ? "bg-warning" : "bg-muted-foreground"
              }`} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/client/lawyer/${lawyer.id}`} className="text-lg font-semibold text-foreground hover:text-accent transition-colors">
                  {lawyer.name}
                </Link>
                {lawyer.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">
                    <Shield className="h-3 w-3" /> Verified
                  </span>
                )}
                <button
                  onClick={() => onToggleSave(lawyer.id)}
                  className="ml-auto sm:ml-0"
                  title={isSaved ? "Remove from saved" : "Save lawyer"}
                  aria-label={isSaved ? "Remove from saved" : "Save lawyer"}
                >
                  <Heart className={`h-5 w-5 transition-colors ${isSaved ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
                </button>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> {lawyer.firm}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              <span className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(lawyer.rating) ? "text-accent fill-accent" : "text-border"}`} />
                  ))}
                </div>
                <span className="font-semibold text-foreground">{lawyer.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({lawyer.review_count})</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{lawyer.experience_years}</span> yrs
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Scale className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{casesHandled}+</span> cases
              </span>
            </div>

            {/* Short description */}
            {lawyer.short_description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{lawyer.short_description}</p>
            )}

            {/* Practice areas */}
            <div className="flex flex-wrap gap-1.5">
              {(lawyer.practice_areas || []).slice(0, 3).map((pa) => (
                <Badge key={pa} variant="secondary" className="text-[11px] px-2 py-0.5 font-medium rounded-lg">{pa}</Badge>
              ))}
              {(lawyer.practice_areas || []).length > 3 && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 rounded-lg">+{lawyer.practice_areas.length - 3}</Badge>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
            {lawyer.website_url ? (
              <Button variant="gold" size="default" asChild className="gap-2">
                <a href={lawyer.website_url} target="_blank" rel="noopener noreferrer">
                  Visit Website <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button variant="gold" size="default" asChild>
                <Link to={`/client/lawyer/${lawyer.id}`}>
                  View Profile <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link to={`/client/lawyer/${lawyer.id}`}>Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FindLawyers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState("");

  const urlQuery = searchParams.get("q") || "";
  const urlMatched = searchParams.get("matched") || "";
  const matchedCategories = urlMatched ? urlMatched.split(",") : [];

  // Load saved lawyer IDs
  useEffect(() => {
    if (!user) return;
    supabase.from("saved_lawyers").select("lawyer_id").eq("user_id", user.id).then(({ data }) => {
      setSavedIds(new Set((data || []).map((d: any) => d.lawyer_id)));
    });
  }, [user]);

  const toggleSave = async (lawyerId: string) => {
    if (!user) { toast.error("Please sign in to save lawyers"); return; }
    const isSaved = savedIds.has(lawyerId);
    if (isSaved) {
      await supabase.from("saved_lawyers").delete().eq("user_id", user.id).eq("lawyer_id", lawyerId);
      setSavedIds((prev) => { const next = new Set(prev); next.delete(lawyerId); return next; });
      toast.success("Removed from saved");
    } else {
      await supabase.from("saved_lawyers").insert({ user_id: user.id, lawyer_id: lawyerId });
      setSavedIds((prev) => new Set(prev).add(lawyerId));
      toast.success("Lawyer saved!");
    }
    queryClient.invalidateQueries({ queryKey: ["saved-lawyers"] });
  };

  // Fetch lawyers - filter by matched categories if provided
  useEffect(() => {
    setLoading(true);
    (async () => {
      let query = supabase.from("lawyers").select("*");

      if (matchedCategories.length === 1) {
        query = query.contains("practice_areas", [matchedCategories[0]]);
      }

      const { data } = await query.order("rating", { ascending: false });
      let results = ((data as any[]) || []).map((l) => ({
        ...l,
        practice_areas: l.practice_areas || [],
        languages: l.languages || [],
      })) as Lawyer[];

      // If multiple matched categories, filter client-side (any match)
      if (matchedCategories.length > 1) {
        results = results.filter((l) =>
          l.practice_areas.some((pa) => matchedCategories.includes(pa))
        );
      }

      setLawyers(results);
      setLoading(false);
    })();
  }, [urlMatched]);

  // Local search filter
  const filtered = useMemo(() => {
    if (!searchInput.trim()) return lawyers;
    const q = searchInput.toLowerCase();
    return lawyers.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.firm.toLowerCase().includes(q) ||
        (l.practice_areas || []).some((pa) => pa.toLowerCase().includes(q)) ||
        (l.short_description || "").toLowerCase().includes(q)
    );
  }, [lawyers, searchInput]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "rating": arr.sort((a, b) => b.rating - a.rating); break;
      case "review_count": arr.sort((a, b) => b.review_count - a.review_count); break;
      case "experience": arr.sort((a, b) => b.experience_years - a.experience_years); break;
    }
    return arr;
  }, [filtered, sortBy]);

  const pageTitle = matchedCategories.length === 1
    ? `${matchedCategories[0]} Lawyers`
    : urlQuery
    ? `Results for "${urlQuery}"`
    : "All Lawyers";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border/50">
        <div className="container flex items-center gap-3 h-16">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-accent" />
            <span className="font-serif text-base text-foreground hidden sm:inline">Legalhubly</span>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="hidden sm:inline">AI-powered matching</span>
          </div>
        </div>
      </header>

      <div className="container py-8 md:py-12">
        {/* Title + Search */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-foreground">{pageTitle}</h1>
              <p className="text-muted-foreground mt-1">
                {loading ? "Searching..." : `${sorted.length} lawyer${sorted.length !== 1 ? "s" : ""} found`}
              </p>
            </div>
            {matchedCategories.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/6 border border-accent/12 text-accent text-xs font-semibold">
                <Zap className="h-3.5 w-3.5" />
                Smart Match
              </div>
            )}
          </div>

          {/* Search within results */}
          <div className="flex items-center gap-2 bg-card border border-border/60 rounded-xl px-4 py-2.5 max-w-md focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter by name, firm, or specialty..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6">
          <span className="text-xs text-muted-foreground font-medium shrink-0 flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" /> Sort:
          </span>
          {SORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  sortBy === opt.value
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-accent/20"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {opt.label}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border shadow-card p-6 animate-pulse">
                <div className="flex gap-5">
                  <div className="h-20 w-20 rounded-2xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-48 bg-muted rounded-lg" />
                    <div className="h-4 w-32 bg-muted rounded-lg" />
                    <div className="h-4 w-64 bg-muted rounded-lg" />
                  </div>
                </div>
              </div>
            ))
          ) : sorted.length > 0 ? (
            sorted.map((lawyer, i) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} index={i} savedIds={savedIds} onToggleSave={toggleSave} />
            ))
          ) : (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">No lawyers found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Try a different search term or browse all lawyers.
              </p>
              <Button variant="outline" asChild>
                <Link to="/client/find-lawyers">View All Lawyers</Link>
              </Button>
            </div>
          )}
        </div>

        {sorted.length > 0 && (
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground mt-6">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/60" />
            <span>Results are sorted by {SORT_OPTIONS.find(o => o.value === sortBy)?.label.toLowerCase()}. Always verify credentials independently.</span>
          </div>
        )}
      </div>
    </div>
  );
}
