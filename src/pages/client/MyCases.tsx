import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { clientNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, StatusBadge } from "@/components/DashboardComponents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, MessageSquare, FileText, CreditCard, Video,
  Loader2, Calendar, Clock, Upload, Download, Trash2, Send, User,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Cases Tab ───
function CasesTab() {
  const { user } = useAuth();
  const [matters, setMatters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("matters").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setMatters(data || []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (matters.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No cases yet</h3>
      <p className="text-sm text-muted-foreground">Your legal cases will appear here once started.</p>
    </div>
  );

  const statusVariant = (s: string) => s === "active" ? "success" as const : s === "closed" ? "default" as const : s === "pending" ? "warning" as const : "info" as const;

  return (
    <div className="space-y-3">
      {matters.map((m, i) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{m.title}</h3>
                <StatusBadge status={m.status} variant={statusVariant(m.status)} />
                <Badge variant="outline" className="text-[10px]">{m.priority}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{m.case_number} · {m.legal_category || "General"}</div>
            </div>
            {m.next_deadline && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Calendar className="h-3.5 w-3.5" />{new Date(m.next_deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

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
    setDocs(data || []);
    setLoading(false);
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
    toast.success("Document uploaded");
    setUploading(false);
    fetchDocs();
  };

  const handleDownload = async (doc: any) => {
    const { data, error } = await supabase.storage.from(doc.bucket).download(doc.path);
    if (error || !data) { toast.error("Download failed"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = doc.filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: any) => {
    await supabase.storage.from(doc.bucket).remove([doc.path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success("Document deleted");
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
          <p className="text-sm text-muted-foreground mb-4">Upload your legal documents to keep them organized.</p>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-accent" />
              </div>
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

// ─── Messages Tab ───
function MessagesTab() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: parts } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
      if (parts && parts.length > 0) {
        const ids = parts.map((p: any) => p.conversation_id);
        const { data: convos } = await supabase.from("conversations").select("*").in("id", ids).order("updated_at", { ascending: false });
        setConversations(convos || []);
        if (convos && convos.length > 0) setActiveConvo(convos[0].id);
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!activeConvo) return;
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", activeConvo).order("created_at", { ascending: true });
      setMessages(data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    })();
    const channel = supabase.channel(`messages-${activeConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvo || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: activeConvo, sender_user_id: user.id, body: newMessage.trim() });
    if (error) toast.error("Failed to send");
    else setNewMessage("");
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (conversations.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No messages yet</h3>
      <p className="text-sm text-muted-foreground">Your conversations with lawyers will appear here.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
      <div className="rounded-xl border bg-card overflow-y-auto">
        {conversations.map((c) => (
          <button key={c.id} onClick={() => setActiveConvo(c.id)}
            className={`w-full p-4 text-left border-b hover:bg-muted/50 transition-colors ${activeConvo === c.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0"><User className="h-5 w-5 text-accent" /></div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">Conversation</div>
                <div className="text-xs text-muted-foreground">{new Date(c.updated_at || c.created_at || "").toLocaleDateString()}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="md:col-span-2 rounded-xl border bg-card flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender_user_id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${msg.sender_user_id === user?.id ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                {msg.body}
                <div className={`text-[10px] mt-1 ${msg.sender_user_id === user?.id ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t flex gap-2">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} />
          <Button onClick={handleSend} disabled={sending || !newMessage.trim()} size="icon"><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

// ─── Payments Tab ───
function PaymentsTab() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("payments").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setPayments(data || []); setLoading(false); });
  }, [user]);

  const statusVariant = (s: string) => s === "paid" ? "success" as const : s === "pending" ? "warning" as const : s === "overdue" ? "destructive" as const : "default" as const;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (payments.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No payments yet</h3>
      <p className="text-sm text-muted-foreground">Your payment history will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {payments.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">${p.amount.toFixed(2)}</span>
              <StatusBadge status={p.status} variant={statusVariant(p.status)} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{p.description || "Payment"} · {new Date(p.created_at).toLocaleDateString()}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Consultations Tab ───
function ConsultationsTab() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("consultations").select("*").order("scheduled_at", { ascending: false })
      .then(({ data }) => { setConsultations(data || []); setLoading(false); });
  }, [user]);

  const statusVariant = (s: string) => s === "scheduled" ? "info" as const : s === "completed" ? "success" as const : s === "cancelled" ? "destructive" as const : "default" as const;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (consultations.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No consultations yet</h3>
      <p className="text-sm text-muted-foreground">Book a consultation with a lawyer to get started.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {consultations.map((c, i) => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
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
              <div className="text-sm font-semibold text-foreground shrink-0">{c.fee_amount === 0 ? "Free" : `$${c.fee_amount}`}</div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ───
export default function MyCases() {
  const { profile } = useAuth();

  return (
    <DashboardLayout sidebarItems={clientNavItems} portalLabel="Client Portal" userName={profile?.full_name || "Client"} userRole="Client">
      <SectionHeader title="My Cases" subtitle="Manage your legal matters, documents, and communications" />

      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="cases" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Briefcase className="h-4 w-4" /> Cases
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <MessageSquare className="h-4 w-4" /> Messages
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <CreditCard className="h-4 w-4" /> Payments
          </TabsTrigger>
          <TabsTrigger value="consultations" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Video className="h-4 w-4" /> Consultations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases"><CasesTab /></TabsContent>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="messages"><MessagesTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="consultations"><ConsultationsTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
