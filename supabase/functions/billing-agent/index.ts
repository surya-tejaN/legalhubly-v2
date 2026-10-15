import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiChatEnv } from "../_shared/ai_chat.ts";
import { guardAiRequest, jsonError, resolveLawyerIdForUser } from "../_shared/ai_guard.ts";
import { logError, logInfo } from "../_shared/log.ts";

const FN = "billing-agent";

serve(async (req) => {
  const gated = await guardAiRequest(req, FN, { maxPerMinute: 10, maxPerDay: 80 });
  if (gated instanceof Response) return gated;

  const { corsHeaders, requestId, userId, serviceClient, startedAt } = gated;

  try {
    const lawyerId = await resolveLawyerIdForUser(serviceClient, userId);
    if (!lawyerId) {
      return jsonError(corsHeaders, requestId, 403, "Lawyer profile required.");
    }

    const { action, matter_id, time_entries, client_name, payments } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    let prompt = "";

    if (action === "generate_invoice") {
      let entries = time_entries;
      let matter: Record<string, unknown> | null = null;

      if (matter_id) {
        const { data: m } = await serviceClient
          .from("matters")
          .select("*")
          .eq("id", matter_id)
          .eq("lawyer_id", lawyerId)
          .maybeSingle();
        if (!m) {
          return jsonError(corsHeaders, requestId, 404, "Matter not found.");
        }
        matter = m;
        if (!entries) {
          const { data } = await serviceClient
            .from("time_entries")
            .select("*")
            .eq("matter_id", matter_id)
            .eq("billable", true);
          entries = data || [];
        }
      }

      prompt = `Generate a professional legal invoice with the following details:

Client: ${client_name || matter?.client_name || "[Client Name]"}
Matter: ${matter?.title || "[Matter Title]"} (${matter?.case_number || ""})
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

Time Entries:
${(entries || []).map((e: { description: string; hours: number; rate: number; date: string }) =>
  `- ${e.description}: ${e.hours}h @ $${e.rate}/hr = $${(e.hours * e.rate).toFixed(2)} (${e.date})`
).join("\n")}

Total Hours: ${(entries || []).reduce((sum: number, e: { hours: number }) => sum + e.hours, 0)}
Total Amount: $${(entries || []).reduce((sum: number, e: { hours: number; rate: number }) => sum + (e.hours * e.rate), 0).toFixed(2)}

Format as a clean, professional invoice with Net 30, itemized entries, and payment instructions.
⚠️ Include: "This invoice was generated with AI assistance. Please verify all entries before sending."`;
    } else if (action === "payment_reminder") {
      prompt = `Generate a professional but friendly payment reminder email for:

Client: ${client_name || "[Client Name]"}
Outstanding payments:
${(payments || []).map((p: { amount: number; description?: string; due_date?: string }) =>
  `- $${p.amount} (${p.description || "Legal services"}) — Due: ${p.due_date || "Upon receipt"}`
).join("\n")}

Total Outstanding: $${(payments || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0).toFixed(2)}

Write a polite reminder. Include AI-assistance disclaimer.`;
    } else if (action === "consultation_receipt") {
      prompt = `Generate a consultation payment receipt/confirmation for:

Client: ${client_name || "[Client Name]"}
Amount: $${payments?.[0]?.amount || 0}
Service: Legal Consultation
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

Include confirmation details, what to expect next, and a thank you message.`;
    } else {
      return jsonError(
        corsHeaders,
        requestId,
        400,
        "Unknown action. Use: generate_invoice, payment_reminder, or consultation_receipt",
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
              "You are a billing assistant for a law firm. Generate clean, professional financial documents. Always include AI-generated content disclaimers.",
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
