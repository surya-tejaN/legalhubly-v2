import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { SectionHeader } from "@/components/DashboardComponents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Trash2, Star, MapPin, Briefcase, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";


interface SavedRow {
  id: string;
  created_at: string;
  lawyers: {
    id: string;
    name: string;
    firm: string;
    city: string | null;
    state: string | null;
    practice_areas: string[];
    experience_years: number;
    rating: number;
    review_count: number;
    avatar_initials: string;
    verified: boolean;
    consultation_fee: number | null;
  } | null;
}

export default function SavedLawyers() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("saved_lawyers")
        .select("id, created_at, lawyers(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        toast.error("Failed to load saved lawyers");
      }
      setSaved((data as any) || []);
      setLoading(false);
    })();
  }, [user]);

  const removeLawyer = async (savedId: string) => {
    const { error } = await supabase.from("saved_lawyers").delete().eq("id", savedId);
    if (error) {
      toast.error("Failed to remove");
      return;
    }
    setSaved((prev) => prev.filter((s) => s.id !== savedId));
    toast.success("Lawyer removed from saved");
    queryClient.invalidateQueries({ queryKey: ["saved-lawyers"] });
  };

  return (
    <DashboardLayout sidebarItems={clientNavItems} portalLabel="Client Portal" userName={profile?.full_name || "User"} userRole="Client">
      <SectionHeader
        title="Saved Lawyers"
        subtitle="Your shortlisted attorneys"
        action={
          <Button variant="gold" size="sm" asChild>
            <Link to="/client/find-lawyers">Find More <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : saved.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No saved lawyers yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Browse lawyers and tap the heart icon to save your favorites for quick access.
          </p>
          <Button variant="gold" asChild>
            <Link to="/client/find-lawyers">Browse Lawyers</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{saved.length} saved lawyer{saved.length !== 1 ? "s" : ""}</p>
          {saved.map((item, i) => {
            const lawyer = item.lawyers;
            if (!lawyer) return null;
            const location = [lawyer.city, lawyer.state].filter(Boolean).join(", ");
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
              >
                <Link to={`/client/lawyer/${lawyer.id}`} className="shrink-0">
                  <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <span className="text-base font-bold text-accent">{lawyer.avatar_initials}</span>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/client/lawyer/${lawyer.id}`} className="font-semibold text-foreground hover:text-accent transition-colors">
                    {lawyer.name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{lawyer.firm}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    {location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-accent fill-accent" />{lawyer.rating.toFixed(1)}
                      <span className="text-muted-foreground/60">({lawyer.review_count})</span>
                    </span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{lawyer.experience_years} yrs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lawyer.practice_areas?.[0] && (
                    <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{lawyer.practice_areas[0]}</Badge>
                  )}
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-semibold text-foreground">
                      {lawyer.consultation_fee ? `$${lawyer.consultation_fee}` : "Free"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">consultation</div>
                  </div>
                  <Button variant="gold" size="sm" asChild>
                    <Link to={`/client/lawyer/${lawyer.id}`}>View</Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-9 w-9" onClick={() => removeLawyer(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
    </DashboardLayout>
  );
}
