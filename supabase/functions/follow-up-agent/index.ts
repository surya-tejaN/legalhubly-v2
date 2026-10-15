import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiChatEnv } from "../_shared/ai_chat.ts";
import { guardAiRequest, jsonError, resolveLawyerIdForUser } from "../_shared/ai_guard.ts";
import { logError, logInfo } from "../_shared/log.ts";

const FN = "follow-up-agent";

serve(async (req) => {
  const gated = await guardAiRequest(req, FN, { maxPerMinute: 10, maxPerDay: 80 });
  if (gated instanceof Response) return gated;

  const { corsHeaders, requestId, userId, serviceClient, startedAt } = gated;

  try {
    const lawyerId = await resolveLawyerIdForUser(serviceClient, userId);
    if (!lawyerId) {
      return jsonError(corsHeaders, requestId, 403, "Lawyer profile required.");
    }

    const { action } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    let prompt = "";

    if (action === "stale_leads") {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: staleLeads } = await serviceClient
        .from("leads")
        .select("client_name, legal_category, lead_score, status, updated_at, issue")
        .eq("lawyer_id", lawyerId)
        .in("status", ["new", "warm"])
        .lt("updated_at", threeDaysAgo)
        .order("lead_score", { ascending: false })
        .limit(25);

      prompt = `You are a follow-up assistant for a law firm. Analyze these stale leads and generate personalized follow-up recommendations.

Stale leads (not contacted in 3+ days):
${(staleLeads || []).map((l) =>
  `- ${l.client_name} | ${l.legal_category || "Unknown"} | Score: ${l.lead_score} | Status: ${l.status} | Last updated: ${l.updated_at} | Issue: ${(l.issue || "").substring(0, 100)}`
).join("\n") || "(none)"}

For each lead, provide:
1. **Priority** (High/Medium/Low)
2. **Suggested action** (call, email, or close)
3. **Draft message**
4. **Why**

⚠️ Note: "These follow-up suggestions are AI-generated. Review each recommendation before taking action."`;
    } else if (action === "no_show_consultations") {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: noShows } = await serviceClient
        .from("consultations")
        .select("client_name, title, scheduled_at, type")
        .eq("lawyer_id", lawyerId)
        .eq("status", "scheduled")
        .lt("scheduled_at", yesterday)
        .limit(25);

      prompt = `Analyze these missed/no-show consultations and generate follow-up actions:

No-show consultations:
${(noShows || []).map((c) =>
  `- ${c.client_name} | ${c.title} | Scheduled: ${c.scheduled_at} | Type: ${c.type}`
).join("\n") || "(none)"}

For each no-show, provide suggested follow-up, draft message, and timing.
⚠️ "These suggestions are AI-generated. Please review before sending to clients."`;
    } else if (action === "overdue_tasks") {
      const today = new Date().toISOString().split("T")[0];
      const { data: overdueTasks } = await serviceClient
        .from("tasks")
        .select("title, due_date, priority, matters!inner(title, client_name, lawyer_id)")
        .eq("matters.lawyer_id", lawyerId)
        .neq("status", "completed")
        .lt("due_date", today)
        .limit(25);

      prompt = `Generate a prioritized action plan for these overdue tasks:

Overdue tasks:
${(overdueTasks || []).map((t: { title: string; due_date: string; priority: string; matters?: { title?: string; client_name?: string } | { title?: string; client_name?: string }[] }) => {
  const matter = Array.isArray(t.matters) ? t.matters[0] : t.matters;
  return `- "${t.title}" | Due: ${t.due_date} | Priority: ${t.priority} | Matter: ${matter?.title || "N/A"} | Client: ${matter?.client_name || "N/A"}`;
}).join("\n") || "(none)"}

Provide prioritized order, time estimates, and a brief daily plan.
⚠️ "This task plan is AI-generated. Adjust based on your current workload."`;
    } else {
      return jsonError(
        corsHeaders,
        requestId,
        400,
        "Unknown action. Use: stale_leads, no_show_consultations, or overdue_tasks",
      );
    }

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a law firm follow-up assistant. Generate actionable, empathetic follow-up plans. Always include AI-generated disclaimers. Only use the tenant-scoped data provided.",
          },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      logError({ fn: FN, requestId, event: "ai_error", status: response.status, body: t.slice(0, 300) });
      if (response.status === 429) {
        return jsonError(corsHeaders, requestId, 429, "Rate limit exceeded.");
      }
      if (response.status === 402) {
        return jsonError(corsHeaders, requestId, 402, "AI usage limit reached.");
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    logInfo({ fn: FN, requestId, userId, event: "request_ok", ms: Date.now() - startedAt, action });
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    logError({
      fn: FN,
      requestId,
      event: "request_error",
      error: e instanceof Error ? e.message : String(e),
    });
    return jsonError(
      corsHeaders,
      requestId,
      500,
      e instanceof Error ? e.message : "Unknown error",
    );
  }
});
