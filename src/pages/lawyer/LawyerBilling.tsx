import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { Receipt, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface Invoice {
  id: string; invoice_number: string; client_name: string; amount: number;
  total_amount: number; status: string; due_date: string | null; created_at: string;
}

const statusVariant = (s: string) => {
  if (s === "paid") return "success" as const;
  if (s === "sent" || s === "draft") return "warning" as const;
  if (s === "overdue") return "destructive" as const;
  return "default" as const;
};

export default function LawyerBilling() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      setInvoices(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Billing" subtitle="Invoices and payments" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No invoices yet</h3>
          <p className="text-sm text-muted-foreground">Your billing history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv, i) => (
            <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{inv.invoice_number}</span>
                  <StatusBadge status={inv.status} variant={statusVariant(inv.status)} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{inv.client_name} · ${inv.total_amount.toFixed(2)}</div>
              </div>
              {inv.due_date && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Calendar className="h-3.5 w-3.5" /> {new Date(inv.due_date).toLocaleDateString()}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
