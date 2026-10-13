import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { Calendar, Loader2, Clock, Video } from "lucide-react";
import { motion } from "framer-motion";

interface Consultation {
  id: string; title: string; client_name: string; scheduled_at: string;
  duration_minutes: number; status: string; type: string;
}

export default function LawyerCalendar() {
  const { profile } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("consultations").select("*").order("scheduled_at", { ascending: true });
      setConsultations(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Calendar" subtitle="Upcoming consultations and deadlines" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No upcoming events</h3>
          <p className="text-sm text-muted-foreground">Your schedule will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex flex-col items-center justify-center shrink-0">
                <div className="text-[10px] font-bold text-accent uppercase">{new Date(c.scheduled_at).toLocaleDateString("en", { month: "short" })}</div>
                <div className="text-lg font-bold text-foreground leading-none">{new Date(c.scheduled_at).getDate()}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-sm">{c.title}</h3>
                  <StatusBadge status={c.status} variant={c.status === "scheduled" ? "info" : "success"} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{c.client_name}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.duration_minutes}m</span>
                  <span className="flex items-center gap-1"><Video className="h-3 w-3" />{c.type}</span>
                </div>
              </div>
              <div className="text-sm font-medium text-foreground shrink-0">
                {new Date(c.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
