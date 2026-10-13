import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, MapPin, Shield, ArrowLeft, Globe, Briefcase,
  Heart, Award, Scale, Languages, ExternalLink,
  CheckCircle2, Timer, Loader2, Building2, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Lawyer {
  id: string;
  name: string;
  firm: string;
  avatar_initials: string;
  verified: boolean;
  practice_areas: string[];
  experience_years: number;
  jurisdictions: string[];
  city: string | null;
  state: string | null;
  languages: string[];
  avg_response_hours: number;
  availability_status: string;
  rating: number;
  review_count: number;
  review_summary: string | null;
  bio: string | null;
  specialization_tags: string[];
  email: string | null;
  phone: string | null;
  website_url: string | null;
  short_description: string | null;
  hourly_rate: number | null;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn("h-4 w-4", s <= Math.round(rating) ? "fill-accent text-accent" : "text-border")} />
      ))}
    </div>
  );
}

export default function LawyerProfile() {
  const { lawyerId } = useParams();
  const navigate = useNavigate();
  const [lawyer, setLawyer] = useState<Lawyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!lawyerId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("lawyers")
        .select("*")
        .eq("id", lawyerId)
        .maybeSingle();
      if (error) toast.error("Failed to load lawyer profile");
      setLawyer(data as Lawyer | null);
      setLoading(false);
    })();
  }, [lawyerId]);

  useEffect(() => {
    if (!lawyerId) return;
    (async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("saved_lawyers")
        .select("id")
        .eq("lawyer_id", lawyerId)
        .eq("user_id", userId);
      if (data && data.length > 0) setSaved(true);
    })();
  }, [lawyerId]);

  const handleSave = async () => {
    if (!lawyerId) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { toast.error("Please sign in to save lawyers"); return; }
    if (saved) {
      await supabase.from("saved_lawyers").delete().eq("lawyer_id", lawyerId).eq("user_id", userId);
      setSaved(false);
      toast.success("Lawyer removed from saved");
    } else {
      await supabase.from("saved_lawyers").insert({ lawyer_id: lawyerId, user_id: userId });
      setSaved(true);
      toast.success("Lawyer saved!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lawyer not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const location = [lawyer.city, lawyer.state].filter(Boolean).join(", ");
  const responseLabel = lawyer.avg_response_hours < 1 ? "< 1 hour" : lawyer.avg_response_hours < 24 ? `${Math.round(lawyer.avg_response_hours)} hours` : `${Math.round(lawyer.avg_response_hours / 24)} days`;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-nav border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Link to="/" className="font-serif text-lg text-foreground">Legalhubly</Link>
        </div>
      </nav>

      {/* Hero */}
      <motion.section {...fadeUp} className="hero-gradient text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-2xl bg-accent/20 border-2 border-accent/30 flex items-center justify-center shrink-0">
              <span className="text-3xl md:text-4xl font-bold text-accent">{lawyer.avatar_initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-serif">{lawyer.name}</h1>
                {lawyer.verified && (
                  <Badge className="bg-accent/20 text-accent border-accent/30 gap-1">
                    <Shield className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-primary-foreground/70 mb-3">{lawyer.firm}</p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/60">
                {location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {location}</span>}
                <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> {lawyer.experience_years} years</span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {lawyer.rating.toFixed(1)} ({lawyer.review_count} reviews)
                </span>
                <span className="flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" /> {Math.round(lawyer.experience_years * 20 + lawyer.review_count * 3)}+ cases</span>
                <span className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Responds in {responseLabel}</span>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                {lawyer.website_url && (
                  <Button variant="gold" size="lg" asChild className="gap-2">
                    <a href={lawyer.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> Visit Website
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSave}
                  className={cn(
                    "gap-2 border-white/40 hover:bg-white/15 hover:border-white/60",
                    saved ? "text-accent border-accent/40 hover:text-accent" : "text-white hover:text-white"
                  )}
                >
                  <Heart className={cn("h-4 w-4", saved && "fill-accent")} />
                  {saved ? "Saved" : "Save Lawyer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <motion.section {...fadeUp} className="rounded-2xl border bg-card p-6 shadow-card">
              <h2 className="font-serif text-xl text-foreground mb-4">About {lawyer.name}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lawyer.bio || `${lawyer.name} is an experienced attorney at ${lawyer.firm} with ${lawyer.experience_years} years of practice specializing in ${(lawyer.practice_areas || []).slice(0, 3).join(", ")}.`}
              </p>
            </motion.section>

            {/* Practice Areas */}
            <section className="rounded-2xl border bg-card p-6 shadow-card">
              <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-accent" /> Practice Areas
              </h2>
              <div className="flex flex-wrap gap-2">
                {(lawyer.practice_areas || []).map((area) => (
                  <Badge key={area} variant="secondary" className="px-3 py-1.5 text-sm rounded-lg">{area}</Badge>
                ))}
              </div>
              {(lawyer.specialization_tags || []).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Specializations</p>
                  <div className="flex flex-wrap gap-2">
                    {(lawyer.specialization_tags || []).map((tag) => (
                      <Badge key={tag} className="bg-accent/10 text-accent border-accent/20 text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Languages */}
            {(lawyer.languages || []).length > 0 && (
              <section className="rounded-2xl border bg-card p-6 shadow-card">
                <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-accent" /> Languages
                </h2>
                <div className="flex flex-wrap gap-3">
                  {(lawyer.languages || []).map((lang) => (
                    <div key={lang} className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2.5">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{lang}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Jurisdictions */}
            {(lawyer.jurisdictions || []).length > 0 && (
              <section className="rounded-2xl border bg-card p-6 shadow-card">
                <h2 className="font-serif text-xl text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent" /> Jurisdictions
                </h2>
                <div className="flex flex-wrap gap-2">
                  {(lawyer.jurisdictions || []).map((j) => (
                    <Badge key={j} variant="outline" className="px-3 py-1.5 text-sm">{j}</Badge>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-card sticky top-24">
              {lawyer.website_url && (
                <Button variant="gold" className="w-full mb-4 gap-2" asChild>
                  <a href={lawyer.website_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Visit Website
                  </a>
                </Button>
              )}
              <Button variant="ghost" className="w-full gap-2" onClick={handleSave}>
                <Heart className={cn("h-4 w-4", saved && "fill-accent text-accent")} />
                {saved ? "Saved" : "Save Lawyer"}
              </Button>

              <div className="mt-5 pt-5 border-t space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-accent" /> {responseLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-medium text-foreground">{lawyer.experience_years} years</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" /> {lawyer.rating.toFixed(1)}
                  </span>
                </div>
                {lawyer.hourly_rate ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <span className="font-medium text-foreground">${lawyer.hourly_rate}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
