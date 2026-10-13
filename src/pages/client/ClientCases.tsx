import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface Matter {
  id: string;
  title: string;
  case_number: string;
  status: string;
  priority: string;
  legal_category: string | null;
  client_name: string;
  next_deadline: string | null;
  created_at: string;
}

const statusVariant = (s: string) => {
  if (s === "active") return "success" as const;
  if (s === "closed") return "default" as const;
  if (s === "pending") return "warning" as const;
  return "info" as const;
};

export default function ClientCases() {
  const { user, profile } = useAuth();
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("matters")
        .select("*")
        .order("created_at", { ascending: false });
      setMatters(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout sidebarItems={clientNavItems} portalLabel="Client Portal" userName={profile?.full_name || "Client"} userRole="Client">
      <SectionHeader title="My Cases" subtitle="Track your active legal matters" />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : matters.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No cases yet</h3>
          <p className="text-sm text-muted-foreground">Your legal cases will appear here once started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matters.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{m.title}</h3>
                    <StatusBadge status={m.status} variant={statusVariant(m.status)} />
                    <Badge variant="outline" className="text-[10px]">{m.priority}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {m.case_number} · {m.legal_category || "General"}
                  </div>
                </div>
                {m.next_deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(m.next_deadline).toLocaleDateString()}
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
