import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, MapPin, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { PRACTICE_AREAS } from "@/lib/practiceAreas";
import { practiceAreaToSlug, setPageMeta, slugToPracticeArea } from "@/lib/pageMeta";
import { rankLawyers, type RankableLawyer } from "@/lib/lawyerRanking";
import { shareLegalhubly } from "@/lib/shareReferral";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type LawyerRow = RankableLawyer & {
  avatar_initials?: string;
  city?: string | null;
  state?: string | null;
};

export default function PracticeAreaPage() {
  const { slug = "" } = useParams();
  const practiceArea = slugToPracticeArea(slug, PRACTICE_AREAS);
  const [lawyers, setLawyers] = useState<LawyerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!practiceArea) return;
    const title = `Chicago ${practiceArea} Lawyers | Legalhubly`;
    const description =
      `Find verified Chicago ${practiceArea} attorneys on Legalhubly. Describe your issue, get matched, then view profiles, visit websites, or message. Free to start.`;
    const path = `/chicago/${practiceAreaToSlug(practiceArea)}`;
    setPageMeta({
      title,
      description,
      path,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: `https://www.legalhubly.com${path}`,
        about: {
          "@type": "LegalService",
          name: `${practiceArea} in Chicago`,
          areaServed: { "@type": "City", name: "Chicago" },
        },
      },
    });
  }, [practiceArea]);

  useEffect(() => {
    if (!practiceArea) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("lawyers")
        .select(
          "id, name, firm, practice_areas, rating, review_count, experience_years, avg_response_hours, availability_status, verified, short_description, bio, avatar_initials, city, state",
        )
        .eq("city", "Chicago")
        .contains("practice_areas", [practiceArea])
        .order("rating", { ascending: false })
        .limit(24);

      if (error) {
        toast.error("Could not load lawyers.");
        setLawyers([]);
      } else {
        setLawyers((data as LawyerRow[]) || []);
      }
      setLoading(false);
    })();
  }, [practiceArea]);

  const ranked = useMemo(
    () => rankLawyers(lawyers, { practiceArea: practiceArea || undefined, limit: 12 }),
    [lawyers, practiceArea],
  );

  if (!practiceArea) {
    return <Navigate to="/client/find-lawyers" replace />;
  }

  const findPath = `/client/find-lawyers?matched=${encodeURIComponent(practiceArea)}&sort=best_match`;

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border/60 bg-card/40">
        <div className="container py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex">
            <Logo withWordmark wordmarkClassName="text-lg font-bold" />
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const result = await shareLegalhubly({
                  title: `Chicago ${practiceArea} lawyers`,
                  text: `Looking for a Chicago ${practiceArea} lawyer? Match on Legalhubly — free to start.`,
                  path: `/chicago/${practiceAreaToSlug(practiceArea)}`,
                });
                if (result === "copied") toast.success("Link copied — share it anywhere.");
                if (result === "failed") toast.error("Could not share. Copy the URL from the address bar.");
              }}
            >
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
            <Button asChild size="sm" variant="gold">
              <Link to="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="container max-w-4xl py-12 md:py-16 space-y-6">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Chicago · Illinois</p>
          <h1 className="font-serif text-3xl md:text-5xl text-foreground leading-tight">
            Chicago {practiceArea} lawyers
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Describe your issue in plain language, get matched to {practiceArea}, then connect with verified
            Chicago attorneys — profiles, ratings, website, or message. Free to browse.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="gold" size="lg">
              <Link to={findPath}>
                View matched lawyers <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/?match=1">Try Smart Match</Link>
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground border-l-2 border-accent/40 pl-3">
          General directory information only — not legal advice. Consult a licensed Illinois attorney about your situation.
        </p>

        <div className="space-y-3 pt-4">
          <h2 className="text-lg font-semibold text-foreground">Top matches</h2>
          {loading && <p className="text-sm text-muted-foreground">Loading Chicago lawyers…</p>}
          {!loading && ranked.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No listings yet for this area.{" "}
              <Link to="/client/find-lawyers" className="text-accent hover:underline">
                Browse all Chicago lawyers
              </Link>
            </p>
          )}
          <div className="space-y-3">
            {ranked.map((l) => (
              <Link
                key={l.id}
                to={`/client/lawyer/${l.id}`}
                className="block rounded-2xl border border-border/60 bg-card p-5 hover:border-accent/30 hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{l.name}</p>
                    <p className="text-sm text-muted-foreground">{l.firm}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-accent fill-accent" />
                        {Number(l.rating || 0).toFixed(1)} ({l.review_count || 0})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {l.city || "Chicago"}, {l.state || "IL"}
                      </span>
                      <span className="text-accent font-medium">Match {l.match_score}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Why: {l.why_match.join(" · ")}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-8 grid sm:grid-cols-2 gap-3">
          {PRACTICE_AREAS.filter((a) => a !== practiceArea)
            .slice(0, 6)
            .map((area) => (
              <Link
                key={area}
                to={`/chicago/${practiceAreaToSlug(area)}`}
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Chicago {area} lawyers →
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
