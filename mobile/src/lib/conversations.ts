import { supabase } from "./supabase";

export type InboxRow = {
  id: string;
  updatedAt: string;
  title: string;
  subtitle?: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  sender_user_id: string;
  created_at: string;
};

export async function getOrCreateDirectConversation(
  myUserId: string,
  otherUserId: string,
): Promise<{ conversationId: string | null; error?: string }> {
  if (!myUserId || !otherUserId) return { conversationId: null, error: "Missing user." };
  if (myUserId === otherUserId) return { conversationId: null, error: "Cannot message yourself." };

  const { data, error } = await supabase.rpc("create_direct_conversation", {
    p_other_user_id: otherUserId,
  });
  if (error) return { conversationId: null, error: error.message || "Could not start conversation." };
  if (!data || typeof data !== "string") return { conversationId: null, error: "Could not start conversation." };
  return { conversationId: data };
}

export async function fetchInbox(userId: string): Promise<InboxRow[]> {
  const { data: parts, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const ids = (parts || []).map((p: { conversation_id: string }) => p.conversation_id);
  if (ids.length === 0) return [];

  const { data: convos, error: cErr } = await supabase
    .from("conversations")
    .select("id, updated_at, created_at")
    .in("id", ids)
    .order("updated_at", { ascending: false });
  if (cErr) throw new Error(cErr.message);

  const { data: others } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", ids)
    .neq("user_id", userId);

  const otherIds = [...new Set((others || []).map((o: { user_id: string }) => o.user_id))];
  const lawyerRes = otherIds.length
    ? await supabase.from("lawyers").select("user_id, name, firm").in("user_id", otherIds)
    : { data: [] as { user_id: string; name: string; firm: string }[] };

  const lawyerByUser = new Map((lawyerRes.data || []).map((l) => [l.user_id, l]));
  const otherByConvo = new Map(
    (others || []).map((o: { conversation_id: string; user_id: string }) => [o.conversation_id, o.user_id]),
  );

  return (convos || []).map((c: { id: string; updated_at: string | null; created_at: string | null }) => {
    const oid = otherByConvo.get(c.id);
    const lawyer = oid ? lawyerByUser.get(oid) : undefined;
    return {
      id: c.id,
      updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
      title: lawyer?.name || "Conversation",
      subtitle: lawyer?.firm,
    };
  });
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, body, sender_user_id, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as ChatMessage[];
}

export async function sendMessage(conversationId: string, userId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_user_id: userId, body: body.trim() })
    .select("id, body, sender_user_id, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as ChatMessage;
}
