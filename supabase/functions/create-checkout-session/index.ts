import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeadersFor, isOriginAllowed } from "../_shared/cors.ts";
import { appPath } from "../_shared/app_url.ts";

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("User not authenticated");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user?.email) throw new Error("User not authenticated");

    const { lawyerId, lawyerName, consultationType, scheduledAt, clientName, notes } = await req.json();
    if (!lawyerId || !scheduledAt || !clientName) throw new Error("Missing required booking data");

    const priceId = Deno.env.get("STRIPE_CONSULTATION_PRICE_ID") || "price_1TEiTOB79u6551BKTOlpPP1C";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: clientName,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const successQs = new URLSearchParams({
      booking: "success",
      lawyer: lawyerName || "",
      type: consultationType || "video",
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: appPath(`/client/consultations?${successQs.toString()}`, req),
      cancel_url: appPath("/client/find-lawyers", req),
      metadata: {
        supabase_user_id: user.id,
        lawyer_id: lawyerId,
        lawyer_name: lawyerName || "",
        consultation_type: consultationType || "video",
        scheduled_at: scheduledAt,
        client_name: clientName,
        notes: notes || "",
        client_email: user.email,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Checkout failed";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
