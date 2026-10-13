import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const event = JSON.parse(body) as Stripe.Event;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const {
        supabase_user_id,
        lawyer_id,
        lawyer_name,
        consultation_type,
        scheduled_at,
        client_name,
        notes,
        client_email,
      } = metadata;

      if (!supabase_user_id || !lawyer_id || !scheduled_at || !client_name) {
        console.log("Missing metadata, skipping:", metadata);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create consultation
      await supabaseAdmin.from("consultations").insert({
        lawyer_id,
        client_name,
        title: `Consultation with ${lawyer_name || "Lawyer"}`,
        scheduled_at,
        type: consultation_type || "video",
        notes: notes || null,
        status: "scheduled",
        duration_minutes: 30,
        fee_amount: (session.amount_total || 15000) / 100,
        is_mvp_free: false,
      });

      // Create invoice
      await supabaseAdmin.from("invoices").insert({
        lawyer_id,
        client_name,
        description: `Consultation with ${lawyer_name || "Lawyer"}`,
        amount: (session.amount_total || 15000) / 100,
        tax_amount: 0,
        total_amount: (session.amount_total || 15000) / 100,
        status: "paid",
        paid_at: new Date().toISOString(),
        is_mvp_simulated: false,
      });

      // Create conversation
      const { data: convo } = await supabaseAdmin
        .from("conversations")
        .insert({})
        .select("id")
        .single();

      if (convo) {
        await supabaseAdmin.from("conversation_participants").insert([
          { conversation_id: convo.id, user_id: supabase_user_id },
        ]);

        const dateStr = new Date(scheduled_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        const timeStr = new Date(scheduled_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        await supabaseAdmin.from("messages").insert({
          conversation_id: convo.id,
          sender_user_id: supabase_user_id,
          body: `📅 Consultation booked: ${consultation_type || "Video"} Call with ${lawyer_name || "Lawyer"} on ${dateStr} at ${timeStr}. Payment of $${((session.amount_total || 15000) / 100).toFixed(2)} confirmed.`,
        });
      }

      // Send booking confirmation email
      if (client_email) {
        const bookingId = crypto.randomUUID();
        const dateObj = new Date(scheduled_at);
        await supabaseAdmin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "booking-confirmation",
            recipientEmail: client_email,
            idempotencyKey: `booking-confirm-${bookingId}`,
            templateData: {
              clientName: client_name,
              lawyerName: lawyer_name || "Your Lawyer",
              consultationType: consultation_type || "Video Call",
              date: dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
              time: dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
              duration: "30 minutes",
            },
          },
        });

        // Send payment receipt email
        await supabaseAdmin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "payment-receipt",
            recipientEmail: client_email,
            idempotencyKey: `receipt-${bookingId}`,
            templateData: {
              clientName: client_name,
              amount: `$${((session.amount_total || 15000) / 100).toFixed(2)}`,
              description: `Consultation with ${lawyer_name || "Lawyer"}`,
              date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
            },
          },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
