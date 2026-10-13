import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { Video, Loader2, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface Consultation {
  id: string;
  title: string;
  client_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  type: string;
  fee_amount: number | null;
}

const statusVariant = (s: string) => {
  if (s === "scheduled") return "info" as const;
  if (s === "completed") return "success" as const;
  if (s === "cancelled") return "destructive" as const;
  return "default" as const;
};

export default function ClientConsultations() {
  const { user, profile } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("consultations")
        .select("*")
        .order("scheduled_at", { ascending: false });
      setConsultations(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout sidebarItems={clientNavItems} portalLabel="Client Portal" userName={profile?.full_name || "Client"} userRole="Client">
      <SectionHeader title="Consultations" subtitle="Your scheduled and past consultations" />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No consultations yet</h3>
          <p className="text-sm text-muted-foreground">Book a consultation with a lawyer to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    <StatusBadge status={c.status} variant={statusVariant(c.status)} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(c.scheduled_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.duration_minutes} min</span>
                    <span className="capitalize">{c.type}</span>
                  </div>
                </div>
                {c.fee_amount != null && (
                  <div className="text-sm font-semibold text-foreground shrink-0">
                    {c.fee_amount === 0 ? "Free" : `$${c.fee_amount}`}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
