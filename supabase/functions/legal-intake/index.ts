import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAiChatEnv } from "../_shared/ai_chat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an AI legal intake assistant for Legalhubly, an AI-powered legal services platform. Your job is to guide clients through describing their legal matter in a warm, professional, and empathetic conversational style.

## Your Behavior
- Be warm, reassuring, and professional. Many clients are stressed or anxious.
- Ask ONE question at a time. Never overwhelm with multiple questions.
- Use simple language. Avoid legal jargon unless explaining it.
- Acknowledge the client's situation before asking the next question.
- Keep responses concise (2-4 sentences max).

## Information to Collect (in this general order)
1. **Legal category** - What type of legal issue (Personal Injury, Immigration, Family, Criminal, Employment, Business, Real Estate, Estate Planning, Civil Litigation, Other)
2. **Matter description** - What happened, key details
3. **Urgency** - How time-sensitive (low, standard, urgent, emergency)
4. **Location** - City/state where the matter occurred
5. **Timeline** - When did this happen or when does action need to be taken
6. **Opposing party** - Who is the other party involved (company, person, government)
7. **Budget range** - What they can afford (Under $1,000 / $1,000-$5,000 / $5,000-$10,000 / $10,000+)
8. **Consultation preference** - Video, phone, in-person, or any
9. **Language preference** - What language they prefer
10. **Documents** - Ask if they have relevant documents to upload

## Conversation Flow
- Start with a warm greeting and ask what legal issue they need help with
- After they describe the issue, classify the category and ask follow-up questions specific to that category
- Category-specific follow-ups:
  - Personal Injury: injury type, medical treatment, insurance involved, accident date
  - Immigration: visa type, current status, deadline pressures
  - Family: divorce/custody/support, children involved, current living situation
  - Criminal: charges, court date, arrest details
  - Employment: termination/discrimination/harassment, employer size, employment duration
  - Business: formation/contract/dispute, business type, revenue range
  - Real Estate: buy/sell/lease/dispute, property type, transaction timeline
  - Estate Planning: will/trust/probate, family situation, asset types
  - Civil Litigation: dispute type, amount in controversy, prior legal action

## CRITICAL: Tool Calling
When you have collected enough information to generate a summary, call the generate_summary tool. You should call this tool when:
- You've collected at least: legal_category, matter_description, urgency, and location
- The client indicates they're done providing information
- You've asked about all major categories of information

When calling generate_summary, extract ALL information from the conversation into the structured fields.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action } = await req.json();
    const { apiKey: AI_API_KEY, url: AI_CHAT_URL, model: AI_MODEL } = getAiChatEnv();

    // Action: generate summary from conversation
    if (action === "generate_summary") {
      const summaryResponse = await fetch(
        AI_CHAT_URL,
        {
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
                content: `You are a legal intake summarizer. Given a conversation between a client and an intake assistant, extract structured information and generate a professional case summary. You MUST call the generate_summary tool with the extracted data.`,
              },
              ...messages,
              {
                role: "user",
                content:
                  "Please generate the structured intake summary from the conversation above by calling the generate_summary tool.",
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_summary",
                  description:
                    "Generate a structured legal intake summary from the conversation",
                  parameters: {
                    type: "object",
                    properties: {
                      legal_category: {
                        type: "string",
                        enum: [
                          "Personal Injury",
                          "Immigration",
                          "Family",
                          "Criminal",
                          "Employment",
                          "Business",
                          "Real Estate",
                          "Estate Planning",
                          "Civil Litigation",
                          "Other",
                        ],
                      },
                      matter_description: { type: "string", description: "Detailed description of the legal matter" },
                      urgency: { type: "string", enum: ["low", "standard", "urgent", "emergency"] },
                      location: { type: "string" },
                      budget_range: { type: "string" },
                      consultation_preference: { type: "string", enum: ["video", "phone", "in_person", "any"] },
                      timeline: { type: "string" },
                      language_preference: { type: "string" },
                      opposing_party_details: { type: "string" },
                      case_summary: {
                        type: "string",
                        description: "A professional 3-5 sentence summary for lawyers",
                      },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                        description: "Relevant tags like 'wrongful-termination', 'non-compete', etc.",
                      },
                      lead_score: {
                        type: "integer",
                        description: "Quality score 0-100 based on detail, urgency, budget, and seriousness",
                      },
                      recommended_specialties: {
                        type: "array",
                        items: { type: "string" },
                        description: "Recommended lawyer specialties",
                      },
                    },
                    required: ["legal_category", "matter_description", "case_summary", "tags", "lead_score"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: {
              type: "function",
              function: { name: "generate_summary" },
            },
          }),
        }
      );

      if (!summaryResponse.ok) {
        const errText = await summaryResponse.text();
        console.error("Summary generation failed:", summaryResponse.status, errText);
        if (summaryResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (summaryResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${summaryResponse.status}`);
      }

      const summaryData = await summaryResponse.json();
      const toolCall = summaryData.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        const summary = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ summary }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("Failed to extract summary from AI response");
    }

    // Default action: stream conversational response
    const response = await fetch(
      AI_CHAT_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

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
    console.error("legal-intake error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
