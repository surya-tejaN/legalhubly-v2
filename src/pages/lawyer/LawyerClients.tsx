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
  Users, Briefcase, MessageSquare, Video, Calendar, Clock,
  Loader2, Mail, AlertCircle, Send, User,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Leads Tab ───
function LeadsTab() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("leads").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setLeads(data || []); setLoading(false); });
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (leads.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No leads yet</h3>
      <p className="text-sm text-muted-foreground">New client inquiries will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {leads.map((lead, i) => (
        <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          className="p-5 rounded-xl border bg-card hover:shadow-sm transition-shadow">
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
  );
}

// ─── Cases Tab ───
function CasesTab() {
  const [matters, setMatters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("matters").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setMatters(data || []); setLoading(false); });
  }, []);

  const statusVariant = (s: string) => s === "active" ? "success" as const : s === "closed" ? "default" as const : "warning" as const;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (matters.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No cases yet</h3>
      <p className="text-sm text-muted-foreground">Your active cases will appear here.</p>
    </div>
  );

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
              <div className="text-xs text-muted-foreground mt-1">{m.case_number} · {m.client_name} · {m.legal_category || "General"}</div>
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
    supabase.from("messages").select("*").eq("conversation_id", activeConvo).order("created_at", { ascending: true })
      .then(({ data }) => { setMessages(data || []); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); });
    const channel = supabase.channel(`lawyer-msgs-${activeConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as any]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvo || !user) return;
    setSending(true);
    await supabase.from("messages").insert({ conversation_id: activeConvo, sender_user_id: user.id, body: newMessage.trim() });
    setNewMessage("");
    setSending(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (conversations.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No messages yet</h3>
      <p className="text-sm text-muted-foreground">Client messages will appear here.</p>
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
                <div className="text-sm font-medium text-foreground truncate">Client</div>
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

// ─── Consultations Tab ───
function ConsultationsTab() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("consultations").select("*").order("scheduled_at", { ascending: false })
      .then(({ data }) => { setConsultations(data || []); setLoading(false); });
  }, []);

  const statusVariant = (s: string) => s === "scheduled" ? "info" as const : s === "completed" ? "success" as const : "default" as const;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>;
  if (consultations.length === 0) return (
    <div className="text-center py-16 rounded-xl bg-card border">
      <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-serif text-lg text-foreground mb-1">No consultations yet</h3>
      <p className="text-sm text-muted-foreground">Scheduled consultations will appear here.</p>
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
                <span>{c.client_name}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ───
export default function LawyerClients() {
  const { profile } = useAuth();

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Clients" subtitle="Manage leads, cases, and client communications" />

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-xl mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="leads" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" /> Leads
          </TabsTrigger>
          <TabsTrigger value="cases" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Briefcase className="h-4 w-4" /> Cases
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <MessageSquare className="h-4 w-4" /> Messages
          </TabsTrigger>
          <TabsTrigger value="consultations" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Video className="h-4 w-4" /> Consultations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads"><LeadsTab /></TabsContent>
        <TabsContent value="cases"><CasesTab /></TabsContent>
        <TabsContent value="messages"><MessagesTab /></TabsContent>
        <TabsContent value="consultations"><ConsultationsTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
