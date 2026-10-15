import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiChatEnv } from "../_shared/ai_chat.ts";
import { guardAiRequest, jsonError } from "../_shared/ai_guard.ts";
import { logError, logInfo } from "../_shared/log.ts";

const FN = "document-agent";

const SYSTEM_PROMPT = `You are the Document Drafting Agent for Legalhubly. You generate professional legal documents based on case context and attorney instructions.

## Document Types You Can Draft
- Engagement letters
- Intake summaries  
- Demand letters and legal notices
- Service agreements and NDAs
- Settlement agreements
- Follow-up emails to clients
- Legal checklists and action plans
- Motion templates
- Client response letters

## Formatting Rules
- Use proper legal formatting with headers, sections, and numbered clauses
- Include date, parties, and reference numbers
- Use formal legal language appropriate to the document type
- Include signature blocks where appropriate
- Mark placeholders with [PLACEHOLDER] for information you don't have

## CRITICAL Compliance Rules
- Include this disclaimer at the end of every generated document:
  "---\\n⚠️ AI-GENERATED DRAFT — This document was drafted by an AI assistant and is intended as a starting point only. It must be reviewed, edited, and approved by a licensed attorney before use. This does not constitute legal advice."
- Clearly mark all AI-generated content
- Never fabricate case law citations — use [Citation Needed] placeholders
- Distinguish between factual statements from case data and legal analysis

## Source Context
When referencing case details, note where the information came from:
- "[From intake]" for data from the intake conversation
- "[From case file]" for matter record details
- "[Attorney input]" for instructions provided by the lawyer`;

serve(async (req) => {
  const gated = await guardAiRequest(req, FN, { maxPerMinute: 10, maxPerDay: 80 });
  if (gated instanceof Response) return gated;

  const { corsHeaders, requestId, userId, startedAt } = gated;

  try {
    const { messages, document_type, case_context, instructions } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    const contextMessages: Array<{ role: string; content: string }> = [];

    if (case_context) {
      contextMessages.push({
        role: "user",
        content: `Case context:\n${JSON.stringify(case_context, null, 2)}`,
      });
    }

    if (document_type) {
      contextMessages.push({
        role: "user",
        content: `Please draft a ${document_type}. ${instructions || "Use the case context provided."}`,
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

    logInfo({ fn: FN, requestId, userId, event: "request_ok", ms: Date.now() - startedAt });
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
