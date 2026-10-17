import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;
    if (!webhookSecret) {
      console.warn("STRIPE_WEBHOOK_SECRET not set; rejecting unsigned webhook");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

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
          headers: { "Content-Type": "application/json" },
        });
      }

      const amount = (session.amount_total || 15000) / 100;

      const { data: consultation, error: consultErr } = await supabaseAdmin
        .from("consultations")
        .insert({
          lawyer_id,
          client_user_id: supabase_user_id,
          client_name,
          title: `Consultation with ${lawyer_name || "Lawyer"}`,
          scheduled_at,
          type: consultation_type || "video",
          notes: notes || null,
          status: "scheduled",
          duration_minutes: 30,
          fee_amount: amount,
          is_mvp_free: false,
        })
        .select("id")
        .single();

      if (consultErr) {
        console.error("Consultation insert failed:", consultErr);
      }

      await supabaseAdmin.from("invoices").insert({
        lawyer_id,
        client_name,
        description: `Consultation with ${lawyer_name || "Lawyer"}`,
        amount,
        tax_amount: 0,
        total_amount: amount,
        status: "paid",
        paid_at: new Date().toISOString(),
        is_mvp_simulated: false,
      });

      await supabaseAdmin.from("payments").insert({
        lawyer_id,
        client_user_id: supabase_user_id,
        client_name,
        description: `Consultation with ${lawyer_name || "Lawyer"}`,
        amount,
        status: "paid",
        paid_at: new Date().toISOString(),
      });

      const { data: lawyerRow } = await supabaseAdmin
        .from("lawyers")
        .select("user_id")
        .eq("id", lawyer_id)
        .maybeSingle();

      const { data: convo } = await supabaseAdmin
        .from("conversations")
        .insert({})
        .select("id")
        .single();

      if (convo) {
        const participants = [
          { conversation_id: convo.id, user_id: supabase_user_id, role: "client" },
        ];
        if (lawyerRow?.user_id && lawyerRow.user_id !== supabase_user_id) {
          participants.push({
            conversation_id: convo.id,
            user_id: lawyerRow.user_id,
            role: "lawyer",
          });
        }
        await supabaseAdmin.from("conversation_participants").insert(participants);

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
          body: `📅 Consultation booked: ${consultation_type || "Video"} Call with ${lawyer_name || "Lawyer"} on ${dateStr} at ${timeStr}. Payment of $${amount.toFixed(2)} confirmed.`,
        });
      }

      if (client_email) {
        const bookingId = consultation?.id || crypto.randomUUID();
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
              date: dateObj.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              }),
              time: dateObj.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }),
              duration: "30 minutes",
            },
          },
        });

        await supabaseAdmin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "payment-receipt",
            recipientEmail: client_email,
            idempotencyKey: `receipt-${bookingId}`,
            templateData: {
              clientName: client_name,
              amount: `$${amount.toFixed(2)}`,
              description: `Consultation with ${lawyer_name || "Lawyer"}`,
              date: new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
            },
          },
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Webhook error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
