import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Receipt, Calendar, Clock, Upload, Download, Trash2,
  Loader2, DollarSign, Timer, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Documents Tab ───
function DocumentsTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = async () => {
    if (!user) return;
    const { data } = await supabase.from("documents").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: false });
    setDocs(data || []); setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    await supabase.from("documents").insert({ owner_user_id: user.id, filename: file.name, content_type: file.type, size_bytes: file.size, path, bucket: "documents" });
    toast.success("Uploaded"); setUploading(false); fetchDocs();
  };

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage.from(doc.bucket).download(doc.path);
    if (error || !data) { toast.error("Download failed"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = doc.filename; a.click(); URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: any) => {
    await supabase.storage.from(doc.bucket).remove([doc.path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success("Deleted");
  };

  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
          <Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading..." : "Upload"}
        </Button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>
      {docs.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-serif text-lg text-foreground mb-1">No documents yet</h3>
          <p className="text-sm text-muted-foreground">Upload case files and templates here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-accent" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{doc.filename}</div>
                <div className="text-xs text-muted-foreground">{formatSize(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Billing Tab ───
function BillingTab() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("time_entries").select("*").order("date", { ascending: false }).limit(20),
    ]).then(([inv, te]) => {
      setInvoices(inv.data || []);
      setTimeEntries(te.data || []);
      setLoading(false);
    });
  }, []);

  const invStatusVariant = (s: string) => s === "paid" ? "success" as const : s === "sent" ? "info" as const : s === "overdue" ? "destructive" as const : "default" as const;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-8">
      {/* Time Entries */}
      <div>
        <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2"><Timer className="h-5 w-5 text-accent" /> Recent Time Entries</h3>
        {timeEntries.length === 0 ? (
          <div className="text-center py-10 rounded-xl bg-card border">
            <Timer className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No time entries yet. Track your billable hours here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {timeEntries.map((te, i) => (
              <motion.div key={te.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{te.description}</div>
                  <div className="text-xs text-muted-foreground">{te.date} · {te.hours}h @ ${te.rate}/hr</div>
                </div>
                <div className="text-sm font-semibold text-foreground">${(te.hours * te.rate).toFixed(2)}</div>
                <Badge variant={te.billable ? "default" : "outline"} className="text-[10px]">{te.billable ? "Billable" : "Non-billable"}</Badge>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div>
        <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2"><Receipt className="h-5 w-5 text-accent" /> Invoices</h3>
        {invoices.length === 0 ? (
          <div className="text-center py-10 rounded-xl bg-card border">
            <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No invoices yet. Create one to bill your clients.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv, i) => (
              <motion.div key={inv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{inv.invoice_number}</span>
                    <StatusBadge status={inv.status} variant={invStatusVariant(inv.status)} />
                  </div>
                  <div className="text-xs text-muted-foreground">{inv.client_name} · {new Date(inv.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-sm font-bold text-foreground">${inv.total_amount?.toFixed(2)}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Tab ───
function CalendarTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("consultations").select("*").gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(20)
      .then(({ data }) => { setEvents(data || []); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (events.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No upcoming events</h3>
      <p className="text-sm text-muted-foreground">Your scheduled consultations and court dates will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {events.map((evt, i) => {
        const d = new Date(evt.scheduled_at);
        return (
          <motion.div key={evt.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
            <div className="h-14 w-14 rounded-xl bg-accent/10 flex flex-col items-center justify-center shrink-0">
              <div className="text-xs font-semibold text-accent uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</div>
              <div className="text-lg font-bold text-foreground leading-none">{d.getDate()}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground">{evt.title}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{evt.duration_minutes} min</span>
                <span className="capitalize">{evt.type}</span>
                <span>{evt.client_name}</span>
              </div>
            </div>
            <StatusBadge status={evt.status} variant={evt.status === "scheduled" ? "info" : "success"} />
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───
export default function LawyerTools() {
  const { profile } = useAuth();

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Tools" subtitle="Documents, billing, and calendar management" />

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="documents" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Receipt className="h-4 w-4" /> Billing
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4" /> Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="billing"><BillingTab /></TabsContent>
        <TabsContent value="calendar"><CalendarTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
