import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { CreditCard, Loader2, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface Payment {
  id: string;
  amount: number;
  client_name: string;
  status: string;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const statusVariant = (s: string) => {
  if (s === "paid") return "success" as const;
  if (s === "pending") return "warning" as const;
  if (s === "overdue") return "destructive" as const;
  return "default" as const;
};

export default function ClientPayments() {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout sidebarItems={clientNavItems} portalLabel="Client Portal" userName={profile?.full_name || "Client"} userRole="Client">
      <SectionHeader title="Payments" subtitle="View your payment history" />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No payments yet</h3>
          <p className="text-sm text-muted-foreground">Your payment history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">${p.amount.toFixed(2)}</span>
                  <StatusBadge status={p.status} variant={statusVariant(p.status)} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {p.description || "Payment"} · {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              {p.due_date && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Calendar className="h-3.5 w-3.5" /> Due {new Date(p.due_date).toLocaleDateString()}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
