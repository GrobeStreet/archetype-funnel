import type { Config, Context } from "@netlify/functions";

export const config: Config = { path: "/api/checkout" };

const tiers: Record<string, { name: string; priceId: string; fallback: string }> = {
  quick: { name: "Quick Leak Scan", priceId: "price_1TUZOa3kpKePpVieniA9MYef", fallback: "https://buy.stripe.com/28E4gs2qa6VO3Sz69ygnK02" },
  main: { name: "Revenue Leak Report", priceId: "price_1TUZTz3kpKePpVietQcKNa5Y", fallback: "https://buy.stripe.com/aFa00c8Oy3JC60H55ugnK03" },
  deep: { name: "Deep Revenue Intelligence Report", priceId: "price_1TUZYn3kpKePpVieIIqmEg4S", fallback: "https://buy.stripe.com/4gM4gs3ue1Bu74LeG4gnK04" }
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  try {
    const body = await req.json();
    const selectedTier = body.tier || "main";
    const tier = tiers[selectedTier] || tiers.main;
    const secret = Netlify.env.get("STRIPE_SECRET_KEY");
    const site = Netlify.env.get("SITE_URL") || new URL(req.url).origin;

    if (!secret) {
      return json({ url: tier.fallback, mode: "payment_link_fallback" });
    }

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("line_items[0][price]", tier.priceId);
    params.append("line_items[0][quantity]", "1");
    if (body.email) params.append("customer_email", body.email);
    params.append("success_url", `${site}/purchase-success/?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${site}/#pricing`);
    params.append("metadata[tier]", selectedTier);
    params.append("metadata[tier_name]", tier.name);
    params.append("metadata[email]", body.email || "");
    params.append("metadata[url]", body.url || "");
    params.append("metadata[goal]", body.goal || "");
    params.append("metadata[preview_id]", body.previewId || "");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/x-www-form-urlencoded" },
      body: params
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Stripe checkout failed");
    return json({ url: data.url, id: data.id, mode: "checkout_session" });
  } catch (e: any) {
    return json({ error: e?.message || "Could not create checkout" }, 500);
  }
};
