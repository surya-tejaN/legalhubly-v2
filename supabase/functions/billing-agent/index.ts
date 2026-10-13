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
    const { action, matter_id, time_entries, client_name, payments } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let prompt = "";

    if (action === "generate_invoice") {
      // Fetch time entries and matter details
      let entries = time_entries;
      if (!entries && matter_id) {
        const { data } = await supabase
          .from("time_entries")
          .select("*")
          .eq("matter_id", matter_id)
          .eq("billable", true);
        entries = data || [];
      }

      const { data: matter } = matter_id
        ? await supabase.from("matters").select("*").eq("id", matter_id).single()
        : { data: null };

      prompt = `Generate a professional legal invoice with the following details:

Client: ${client_name || matter?.client_name || "[Client Name]"}
Matter: ${matter?.title || "[Matter Title]"} (${matter?.case_number || ""})
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

Time Entries:
${(entries || []).map((e: any) => `- ${e.description}: ${e.hours}h @ $${e.rate}/hr = $${(e.hours * e.rate).toFixed(2)} (${e.date})`).join("\n")}

Total Hours: ${(entries || []).reduce((sum: number, e: any) => sum + e.hours, 0)}
Total Amount: $${(entries || []).reduce((sum: number, e: any) => sum + (e.hours * e.rate), 0).toFixed(2)}

Format as a clean, professional invoice with:
- Invoice number, date, and due date (Net 30)
- Itemized time entries
- Subtotal, any applicable fees, and total
- Payment instructions section
- Professional closing

⚠️ Include at the bottom: "This invoice was generated with AI assistance. Please verify all entries and amounts before sending to the client."`;
    } else if (action === "payment_reminder") {
      prompt = `Generate a professional but friendly payment reminder email for:

Client: ${client_name || "[Client Name]"}
Outstanding payments:
${(payments || []).map((p: any) => `- $${p.amount} (${p.description || "Legal services"}) — Due: ${p.due_date || "Upon receipt"}`).join("\n")}

Total Outstanding: $${(payments || []).reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)}

Write a polite, professional reminder that:
- Acknowledges they may have already sent payment
- Lists the outstanding items
- Provides payment instructions
- Offers to discuss payment plans if needed
- Maintains the professional relationship

⚠️ Include at the bottom: "This reminder was drafted with AI assistance. Please review before sending."`;
    } else if (action === "consultation_receipt") {
      prompt = `Generate a consultation payment receipt/confirmation for:

Client: ${client_name || "[Client Name]"}
Amount: $${payments?.[0]?.amount || 0}
Service: Legal Consultation
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

Include confirmation details, what to expect next, and a thank you message.`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action. Use: generate_invoice, payment_reminder, or consultation_receipt" }), {
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
          {
            role: "system",
            content: "You are a billing assistant for a law firm. Generate clean, professional financial documents. Always use proper formatting with headers and sections. Include appropriate disclaimers about AI-generated content.",
          },
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
    console.error("billing-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
