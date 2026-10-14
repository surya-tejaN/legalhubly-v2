import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyLawyerId } from "@/lib/lawyerAccount";
import { useQuery } from "@tanstack/react-query";
import { StatCard, SectionHeader } from "@/components/DashboardComponents";
import { Users, Briefcase, Calendar, DollarSign, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LawyerDashboard() {
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Counselor";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["lawyer-stats", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const lawyerId = await fetchMyLawyerId(user!.id);
      if (!lawyerId) {
        return { leads: 0, cases: 0, consultations: 0, revenue: 0 };
      }

      const [leads, matters, consultations, payments] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("lawyer_id", lawyerId),
        supabase.from("matters").select("id", { count: "exact", head: true }).eq("lawyer_id", lawyerId),
        supabase.from("consultations").select("id", { count: "exact", head: true }).eq("lawyer_id", lawyerId),
        supabase
          .from("payments")
          .select("amount, status")
          .eq("lawyer_id", lawyerId)
          .in("status", ["paid", "completed"]),
      ]);

      const revenue = (payments.data || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        leads: leads.count || 0,
        cases: matters.count || 0,
        consultations: consultations.count || 0,
        revenue,
      };
    },
  });

  const revenueLabel =
    stats == null
      ? "$0"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(stats.revenue || 0);

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title={`Welcome, ${firstName}`} subtitle="Your practice at a glance" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <StatCard icon={<Users className="h-5 w-5 text-accent" />} label="Active Leads" value={stats?.leads || 0} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <StatCard icon={<Briefcase className="h-5 w-5 text-accent" />} label="Active Cases" value={stats?.cases || 0} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatCard icon={<Calendar className="h-5 w-5 text-accent" />} label="Consultations" value={stats?.consultations || 0} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <StatCard icon={<DollarSign className="h-5 w-5 text-accent" />} label="Revenue" value={revenueLabel} />
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
