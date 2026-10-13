import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAiChatEnv } from "../_shared/ai_chat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let prompt = "";
    let contextData: any = {};

    if (action === "stale_leads") {
      // Find leads that haven't been updated in 3+ days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: staleLeads } = await supabase
        .from("leads")
        .select("*")
        .in("status", ["new", "warm"])
        .lt("updated_at", threeDaysAgo)
        .order("lead_score", { ascending: false });

      contextData.staleLeads = staleLeads || [];

      prompt = `You are a follow-up assistant for a law firm. Analyze these stale leads and generate personalized follow-up recommendations.

Stale leads (not contacted in 3+ days):
${(staleLeads || []).map((l: any) => `- ${l.client_name} | ${l.legal_category || "Unknown"} | Score: ${l.lead_score} | Status: ${l.status} | Last updated: ${l.updated_at} | Issue: ${l.issue?.substring(0, 100)}`).join("\n")}

For each lead, provide:
1. **Priority** (High/Medium/Low) based on lead score and staleness
2. **Suggested action** (call, email, or close)
3. **Draft message** — a brief, personalized follow-up email or call script
4. **Why** — brief reasoning for the suggested action

Format as a structured report. Include a summary at the top.
⚠️ Note: "These follow-up suggestions are AI-generated. Review each recommendation before taking action."`;
    } else if (action === "no_show_consultations") {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: noShows } = await supabase
        .from("consultations")
        .select("*")
        .eq("status", "scheduled")
        .lt("scheduled_at", yesterday);

      contextData.noShows = noShows || [];

      prompt = `Analyze these missed/no-show consultations and generate follow-up actions:

No-show consultations:
${(noShows || []).map((c: any) => `- ${c.client_name} | ${c.title} | Scheduled: ${c.scheduled_at} | Type: ${c.type}`).join("\n")}

For each no-show, provide:
1. **Suggested follow-up** — reschedule email or call
2. **Draft message** — empathetic, professional follow-up
3. **Timing** — when to send the follow-up

⚠️ "These suggestions are AI-generated. Please review before sending to clients."`;
    } else if (action === "overdue_tasks") {
      const today = new Date().toISOString().split("T")[0];
      const { data: overdueTasks } = await supabase
        .from("tasks")
        .select("*, matters(title, client_name)")
        .neq("status", "completed")
        .lt("due_date", today);

      contextData.overdueTasks = overdueTasks || [];

      prompt = `Generate a prioritized action plan for these overdue tasks:

Overdue tasks:
${(overdueTasks || []).map((t: any) => `- "${t.title}" | Due: ${t.due_date} | Priority: ${t.priority} | Matter: ${t.matters?.title || "N/A"} | Client: ${t.matters?.client_name || "N/A"}`).join("\n")}

Provide:
1. Prioritized order to tackle them
2. Time estimates for each
3. Suggestions for delegation or rescheduling where appropriate
4. A brief daily plan

⚠️ "This task plan is AI-generated. Adjust based on your current workload and client priorities."`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action. Use: stale_leads, no_show_consultations, or overdue_tasks" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          { role: "system", content: "You are a law firm follow-up assistant. Generate actionable, empathetic follow-up plans. Always include AI-generated disclaimers." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("follow-up-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
