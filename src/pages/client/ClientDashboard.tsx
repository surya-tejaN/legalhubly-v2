import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Heart, Settings, ArrowRight,
  Star, MapPin, Scale, Sparkles, User,
  Mail, LogOut,
} from "lucide-react";

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const { data: savedLawyers = [] } = useQuery({
    queryKey: ["saved-lawyers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("saved_lawyers")
        .select("*, lawyers(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout
      sidebarItems={clientNavItems}
      portalLabel="Client Portal"
      userName={profile?.full_name || "Client"}
      userRole="Client"
    >
      {/* Welcome */}
      <motion.div {...anim(0)} className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif text-foreground">
              Welcome back, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Discover and connect with the right lawyers for your needs.
            </p>
          </div>
          <Button variant="gold" asChild>
            <Link to="/client/find-lawyers">
              <Sparkles className="mr-2 h-4 w-4" /> Find a Lawyer
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { icon: <Search className="h-5 w-5 text-accent" />, label: "Find Lawyers", value: "Search", to: "/client/find-lawyers" },
          { icon: <Heart className="h-5 w-5 text-accent" />, label: "Saved Lawyers", value: savedLawyers.length, to: "/client/saved-lawyers" },
          { icon: <Settings className="h-5 w-5 text-accent" />, label: "Account", value: "Settings", to: "/client/settings" },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...anim(i * 0.05)}>
            <Link
              to={stat.to}
              className="block rounded-xl bg-card border shadow-card p-5 hover:shadow-card-hover hover:border-accent/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  {stat.icon}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Saved Lawyers */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div {...anim(0.1)}>
            <div className="rounded-xl bg-card border shadow-card">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-accent" /> Saved Lawyers
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/client/saved-lawyers">View All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
              </div>
              {savedLawyers.length === 0 ? (
                <div className="p-8 text-center">
                  <Heart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No saved lawyers yet.</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to="/client/find-lawyers">Browse Lawyers</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {savedLawyers.slice(0, 4).map((sl: any) => {
                    const lawyer = sl.lawyers;
                    if (!lawyer) return null;
                    return (
                      <div key={sl.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                        <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">{lawyer.avatar_initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{lawyer.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{lawyer.firm}</span>
                            {lawyer.city && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" /> {lawyer.city}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Star className="h-3 w-3 text-accent fill-accent" />
                            <span className="text-xs text-muted-foreground">{lawyer.rating}</span>
                            <span className="text-xs text-muted-foreground">· {lawyer.practice_areas?.slice(0, 2).join(", ")}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/client/lawyer/${lawyer.id}`}>View</Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Account Card */}
          <motion.div {...anim(0.05)}>
            <div className="rounded-xl bg-card border shadow-card">
              <div className="p-5 border-b">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-accent" /> Account
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {profile?.profile_photo ? (
                      <img src={profile.profile_photo} className="h-11 w-11 rounded-full object-cover" alt="" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{profile?.full_name || "Not set"}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {profile?.email || user?.email}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Link
                    to="/client/settings"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-sm text-foreground"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Edit Profile
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/5 transition-colors text-sm text-destructive w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Discovery promo */}
          <motion.div {...anim(0.1)}>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">Find Your Lawyer</div>
                  <div className="text-xs text-muted-foreground">Search by city and practice area</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Browse verified attorneys in your area and visit their websites to learn more.
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/client/find-lawyers">
                  <Search className="mr-2 h-3.5 w-3.5" /> Start Searching
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
