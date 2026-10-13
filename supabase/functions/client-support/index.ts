import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiChatEnv } from "../_shared/ai_chat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Client Support Agent for Legalhubly, an AI-powered legal services platform. You help clients understand how the platform works, answer questions about the legal process, and guide them through their journey.

## What You Can Help With
- How the intake process works
- Understanding case statuses and timelines
- Explaining what to expect during a consultation
- How lawyer matching works
- Payment and billing questions
- Document upload and sharing process
- General legal process education (what happens in a lawsuit, mediation, etc.)

## CRITICAL Compliance Rules
- You provide **legal information**, NOT **legal advice**
- Always include this distinction when answering legal questions:
  "ℹ️ This is general legal information for educational purposes. For advice specific to your situation, please consult with your matched attorney."
- Never recommend specific legal strategies for a client's case
- Never predict case outcomes
- Never interpret specific laws for the user's situation
- You CAN explain general legal concepts, timelines, and processes

## Tone
- Warm, reassuring, and patient
- Use simple language — avoid jargon
- Be empathetic — many clients are going through stressful situations
- Keep answers concise (3-5 sentences unless more detail is requested)

## Platform Knowledge
- Intake: Clients describe their issue via AI chat, which classifies the matter and generates a summary
- Matching: AI recommends lawyers based on practice area, location, availability, fees, and reviews
- Consultations: Can be video, phone, or in-person. Typically 30 minutes.
- Documents: Clients can upload and share documents securely with their lawyer
- Payments: Consultation fees are shown upfront. Some lawyers offer contingency or free consultations.
- Timeline: After intake, lawyer matching is instant. Consultations can be booked within days.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

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
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
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
    console.error("client-support error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
