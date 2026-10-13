import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { Users, Loader2, Mail, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Lead {
  id: string;
  client_name: string;
  client_email: string | null;
  issue: string;
  status: string;
  urgency: string;
  lead_score: number;
  legal_category: string | null;
  created_at: string;
}

export default function LawyerLeads() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Leads" subtitle="Incoming client inquiries" />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No leads yet</h3>
          <p className="text-sm text-muted-foreground">New client inquiries will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead, i) => (
            <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{lead.client_name}</h3>
                    <StatusBadge status={lead.status} variant={lead.status === "new" ? "info" : "default"} />
                    <Badge variant={lead.urgency === "urgent" ? "destructive" : "outline"} className="text-[10px]">{lead.urgency}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{lead.issue}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                    {lead.client_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.client_email}</span>}
                    {lead.legal_category && <span>{lead.legal_category}</span>}
                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-accent">{lead.lead_score}</div>
                  <div className="text-[10px] text-muted-foreground">score</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
