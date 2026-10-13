import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { lawyerNavItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/DashboardComponents";
import { MessageSquare, Send, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Conversation { id: string; created_at: string; updated_at: string; }
interface Message { id: string; body: string; sender_user_id: string; created_at: string; }

export default function LawyerMessages() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
    const channel = supabase.channel(`lawyer-msgs-${activeConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvo}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
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

  return (
    <DashboardLayout sidebarItems={lawyerNavItems} portalLabel="Lawyer Portal" userName={profile?.full_name || "Lawyer"} userRole="Lawyer">
      <SectionHeader title="Messages" subtitle="Client conversations" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-card border">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-serif text-lg text-foreground mb-2">No messages yet</h3>
          <p className="text-sm text-muted-foreground">Client conversations will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          <div className="rounded-xl border bg-card overflow-y-auto">
            {conversations.map((c) => (
              <button key={c.id} onClick={() => setActiveConvo(c.id)}
                className={`w-full p-4 text-left border-b hover:bg-muted/50 transition-colors ${activeConvo === c.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0"><User className="h-5 w-5 text-accent" /></div>
                  <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate">Client</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.updated_at || c.created_at || "").toLocaleDateString()}</div></div>
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
      )}
    </DashboardLayout>
  );
}
