import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiChatEnv } from "../_shared/ai_chat.ts";
import { guardAiRequest, jsonError, resolveLawyerIdForUser } from "../_shared/ai_guard.ts";
import { logError, logInfo } from "../_shared/log.ts";

const FN = "lawyer-ai";

const SYSTEM_PROMPT = `You are the AI Legal Productivity Agent for Legalhubly — a multi-capability assistant for attorneys. You handle several modes based on the "agent_mode" specified.

## Modes

### 1. "chat" (default) — General Assistant
Help lawyers with case analysis, research summaries, document review, and strategic thinking.
- Be precise and professional
- Use legal terminology accurately
- Format with clear headings and bullet points

### 2. "case_summary" — Case Summary Agent
Convert raw intake data into structured, attorney-ready case briefs.
- Include: Case overview, key facts, legal issues, recommended actions, risk assessment
- Mark source of each fact: [From intake], [From case file], [Inferred]
- End with recommended next steps

### 3. "suggest_reply" — Reply Drafting
Draft professional responses to clients.
- Match the tone to the situation (reassuring for anxious clients, direct for business matters)
- Include relevant case updates
- Maintain attorney-client privilege awareness

### 4. "suggest_tasks" — Task Suggestion
Analyze a case and suggest actionable tasks with priorities.
- Return practical, specific tasks
- Include deadlines where inferable
- Prioritize by urgency and impact

### 5. "case_update" — Case Status Update
Generate professional case status updates for clients.
- Summarize recent activity
- Explain next steps in plain language
- Set expectations for timeline

## CRITICAL Compliance Rules
- Always include: "⚖️ AI-generated analysis — for attorney review only. This does not constitute legal advice."
- When citing legal concepts, note if they are general principles vs case-specific analysis
- Never fabricate citations — use [Citation needed] placeholders
- Distinguish between facts from case data and AI analysis/inference
- Mark inferred information as [AI inference]`;

serve(async (req) => {
  const gated = await guardAiRequest(req, FN, { maxPerMinute: 20, maxPerDay: 200 });
  if (gated instanceof Response) return gated;

  const { corsHeaders, requestId, userId, serviceClient, startedAt } = gated;

  try {
    const lawyerId = await resolveLawyerIdForUser(serviceClient, userId);
    if (!lawyerId) {
      return jsonError(corsHeaders, requestId, 403, "Lawyer profile required.");
    }

    const { messages, agent_mode, case_context, matter_id } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    const mode = agent_mode || "chat";
    const contextMessages: Array<{ role: string; content: string }> = [];

    if (matter_id && !case_context) {
      const { data: matter } = await serviceClient
        .from("matters")
        .select("*")
        .eq("id", matter_id)
        .eq("lawyer_id", lawyerId)
        .maybeSingle();

      if (!matter) {
        return jsonError(corsHeaders, requestId, 404, "Matter not found.");
      }

      const [tasksRes, notesRes] = await Promise.all([
        serviceClient.from("tasks").select("*").eq("matter_id", matter_id),
        serviceClient
          .from("internal_notes")
          .select("*")
          .eq("matter_id", matter_id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      contextMessages.push({
        role: "user",
        content: `Case context:\n${JSON.stringify(matter, null, 2)}\n\nTasks:\n${JSON.stringify(tasksRes.data || [], null, 2)}\n\nRecent notes:\n${JSON.stringify(notesRes.data || [], null, 2)}`,
      });
    } else if (case_context) {
      contextMessages.push({
        role: "user",
        content: `Case context:\n${JSON.stringify(case_context, null, 2)}`,
      });
    }

    if (mode === "case_summary") {
      contextMessages.push({
        role: "user",
        content:
          "Generate a comprehensive attorney-ready case summary from the context above. Include: Overview, Key Facts (with source tags), Legal Issues, Risk Assessment, and Recommended Next Steps.",
      });
    } else if (mode === "suggest_tasks") {
      contextMessages.push({
        role: "user",
        content:
          "Based on the case context, suggest 5-8 prioritized tasks with estimated deadlines. Format each as: Priority (High/Medium/Low) | Task | Deadline | Notes.",
      });
    } else if (mode === "suggest_reply") {
      contextMessages.push({
        role: "user",
        content:
          "Draft a professional reply to the client based on the case context and conversation. Be empathetic but factual.",
      });
    } else if (mode === "case_update") {
      contextMessages.push({
        role: "user",
        content:
          "Generate a client-friendly case status update. Summarize recent activity, explain next steps in plain language, and set timeline expectations.",
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
          { role: "system", content: SYSTEM_PROMPT },
          ...contextMessages,
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      logError({ fn: FN, requestId, event: "ai_error", status: response.status, body: t.slice(0, 300) });
      if (response.status === 429) {
        return jsonError(corsHeaders, requestId, 429, "Rate limit exceeded. Please try again shortly.");
      }
      if (response.status === 402) {
        return jsonError(corsHeaders, requestId, 402, "AI usage limit reached.");
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    logInfo({ fn: FN, requestId, userId, event: "request_ok", ms: Date.now() - startedAt, mode });
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
