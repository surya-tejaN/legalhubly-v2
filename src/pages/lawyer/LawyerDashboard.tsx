import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { StatCard, SectionHeader } from "@/components/DashboardComponents";
import { Users, Briefcase, Calendar, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LawyerDashboard() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Counselor";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["lawyer-stats"],
    queryFn: async () => {
      const [leads, matters, consultations] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("matters").select("id", { count: "exact", head: true }),
        supabase.from("consultations").select("id", { count: "exact", head: true }),
      ]);
      return {
        leads: leads.count || 0,
        cases: matters.count || 0,
        consultations: consultations.count || 0,
      };
    },
  });

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
            <StatCard icon={<DollarSign className="h-5 w-5 text-accent" />} label="Revenue" value="$0" />
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
