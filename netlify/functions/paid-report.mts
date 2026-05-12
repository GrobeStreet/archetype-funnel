import type { Config, Context } from "@netlify/functions";

export const config: Config = { path: "/api/paid-report" };

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function esc(value = "") {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));
}
function clean(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
}
function pick(html: string, re: RegExp) { const m = html.match(re); return m ? clean(m[1] || "") : ""; }
function urlCandidates(input: string) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Website URL is required.");
  if (/^https?:\/\//i.test(raw)) return [raw];
  if (!raw.includes(".")) throw new Error("Enter a real website domain, like example.com.");
  const base = raw.replace(/^www\./i, "");
  return [`https://${raw}`, `https://www.${base}`, `http://${raw}`];
}
async function fetchSite(input: string) {
  let last = "Could not read website.";
  for (const url of urlCandidates(input)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 11000);
    try {
      const res = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 RevenueLeakReportsBot/3.0" } });
      if (!res.ok) { last = `Website returned ${res.status}.`; continue; }
      return { url: res.url || url, html: (await res.text()).slice(0, 600000) };
    } catch (e: any) { last = e?.message || last; }
    finally { clearTimeout(timeout); }
  }
  throw new Error(last);
}
function buttons(html: string) {
  const out = new Set<string>();
  const regs = [/<button[^>]*>([\s\S]*?)<\/button>/gi, /<a[^>]*>([\s\S]*?)<\/a>/gi, /aria-label=["']([^"']+)["']/gi, /value=["']([^"']+)["']/gi];
  for (const re of regs) { let m; while ((m = re.exec(html)) && out.size < 20) { const v = clean(m[1] || ""); if (v && v.length > 1 && v.length < 80 && !/^\s*(home|skip|menu|facebook|instagram|twitter|linkedin|privacy|terms)\s*$/i.test(v)) out.add(v); } }
  return Array.from(out);
}
function proofSignals(text: string) {
  const terms = ["review","testimonial","licensed","insured","guarantee","warranty","years","clients","case study","stars","rated","certified","award","results","trusted","featured","secure checkout","free shipping"];
  const low = text.toLowerCase();
  return terms.filter(t => low.includes(t)).slice(0, 10);
}
function extract(url: string, html: string) {
  const title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const meta = pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || pick(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i);
  const h1 = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => clean(m[1] || "")).filter(Boolean).slice(0, 8);
  const btns = buttons(html);
  const all = clean(html).slice(0, 18000);
  return { url, host: new URL(url).hostname.replace(/^www\./,""), title, meta, h1, h2s, buttons: btns, proofSignals: proofSignals(`${title} ${meta} ${h1} ${h2s.join(" ")} ${btns.join(" ")} ${all}`), leadPathDetected: /<form|type=["']tel|mailto:|phone|call now|schedule|book|quote|estimate|appointment|checkout|cart|add to cart|buy now/i.test(html) };
}
function tierName(tier: string) { return tier === "quick" ? "Quick Leak Scan" : tier === "deep" ? "Deep Revenue Intelligence Report" : "Revenue Leak Report"; }
function maxFindings(tier: string) { return tier === "quick" ? 3 : tier === "deep" ? 10 : 5; }
function primaryCta(goal: string) { const g = String(goal).toLowerCase(); if (g.includes("call")) return "Book a Call"; if (g.includes("booking")) return "Check Availability"; if (g.includes("product") || g.includes("sales")) return "Shop the Best Fit"; if (g.includes("local")) return "Get My Local Visibility Plan"; return "Get My Free Quote"; }
function findings(s: any, goal: string) {
  const action = primaryCta(goal), headline = s.h1 || s.title || "No clear headline detected";
  return [
    ["First-impression clarity", `Detected headline/title: "${headline.slice(0,160)}."`, "A cold visitor needs to know who this is for, what outcome they get, and what to do next in the first screen.", `Rewrite the hero as: [Specific buyer] gets [specific outcome] without [common frustration]. Pair it with "${action}."`],
    ["Call-to-action friction", s.buttons.length ? `Detected buttons/links: ${s.buttons.slice(0,8).join(", ")}.` : "No clear CTA buttons were detected.", "Generic or competing actions create browsing instead of buying/contact behavior.", `Choose one primary action and repeat it consistently. Start with "${action}."`],
    ["Trust proof placement", s.proofSignals.length ? `Detected proof signals: ${s.proofSignals.join(", ")}.` : "No obvious review, rating, guarantee, credential, result, or proof language was detected.", "Proof only helps conversion if visitors see it before they decide whether to act.", "Move the strongest proof near the first CTA: review count, customer quote, guarantee, years in business, credential, or result."],
    ["Offer specificity", s.meta ? `Detected description: "${s.meta.slice(0,180)}."` : "No strong meta description was detected.", "Many pages explain a business category but fail to package the offer as a clear next step with a clear payoff.", "Add a compact offer block: who it is for, what they get, how it works, when they get it, and what to click next."],
    ["Lead path visibility", s.leadPathDetected ? "A form, phone, booking, quote, cart, or checkout-related signal was detected." : "No obvious lead or purchase path was detected in the public scan.", "If the conversion path is not obvious, motivated visitors still drift away.", "Repeat one clear next step after the hero, proof, offer explanation, FAQ, and final CTA."],
    ["Section hierarchy", s.h2s.length ? `Detected section headings: ${s.h2s.slice(0,6).join(" | ")}.` : "Few clear section headings were detected.", "Visitors scan before reading. Weak section hierarchy makes the page harder to understand.", "Use headings that answer buyer objections: why this, why trust you, how it works, what happens next, and why act now."],
    ["Search/social preview", `Title: "${s.title || "not detected"}". Description: "${s.meta || "not detected"}."`, "The page preview should sell the outcome before the visitor lands on the site.", "Rewrite the description as: buyer + outcome + proof/constraint + next action."],
    ["AI handoff readiness", "This report is structured so it can be pasted into an AI tool or handed to a web person.", "Generic prompts create generic copy. A diagnosis gives AI better context.", "Use the prompts below to turn this diagnosis into copy, briefs, and checklists."],
    ["Message consistency", "The report compares headline, buttons, metadata, proof language, and next-step language.", "When each part of the page points at a different action, visitors hesitate.", `Align headline, CTA, proof, and final section around one goal: ${goal}.`],
    ["Fix-first order", "The highest leverage work is usually above the fold and near the first CTA.", "Teams often waste time on low-impact design details before fixing message and buyer path.", "Fix in this order: headline, CTA, proof placement, offer block, lead path repetition, then SEO/social preview."]
  ];
}
function reportHtml(s: any, tier: string, goal: string, verified: boolean) {
  const name = tierName(tier), action = primaryCta(goal), items = findings(s, goal).slice(0, maxFindings(tier));
  const reportId = `rlr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const findingHtml = items.map((f, i) => `<section class="report-block"><h3>${i+1}. ${esc(f[0])}</h3><p><b>Evidence:</b> ${esc(f[1])}</p><p><b>Diagnosis:</b> ${esc(f[2])}</p><p><b>Fix:</b> ${esc(f[3])}</p></section>`).join("");
  const html = `<article class="paid-report" data-report-id="${reportId}"><header class="report-hero"><p class="eyebrow">${verified ? "Checkout verified" : "Online report"}</p><h1>${esc(name)}</h1><p><b>Website:</b> ${esc(s.url)}</p><p><b>Main goal:</b> ${esc(goal)}</p><p class="report-note">Written diagnosis generated from public website signals. No implementation, calls, account access, analytics configuration, or ongoing consulting are included.</p></header><section class="report-block"><h2>Executive Snapshot</h2><p>Your website should make the buyer outcome, next step, and proof obvious faster. This report prioritizes first-impression clarity, CTA specificity, trust proof, offer packaging, and next-step visibility.</p></section><section class="report-block"><h2>Public Signals Reviewed</h2><ul><li><b>Headline/title:</b> ${esc(s.h1 || s.title || "No clear headline detected")}</li><li><b>Meta description:</b> ${esc(s.meta || "No strong meta description detected")}</li><li><b>Buttons/links:</b> ${esc(s.buttons.slice(0,10).join(", ") || "No clear CTA buttons detected")}</li><li><b>Proof signals:</b> ${esc(s.proofSignals.join(", ") || "No obvious proof signals detected")}</li></ul></section><section class="report-block"><h2>Fix-First Diagnosis</h2>${findingHtml}</section><section class="report-block"><h2>Suggested Copy Direction</h2><p><b>Primary CTA to test:</b> ${esc(action)}</p><p><b>Hero formula:</b> [Specific buyer] gets [specific outcome] without [common frustration].</p><p><b>Proof formula:</b> Add a short proof line directly under the first CTA: review count, rating, result, credential, guarantee, or number of customers served.</p></section><section class="report-block"><h2>7-Day Fix Plan</h2><ol><li>Rewrite the hero headline and subheadline around the buyer outcome.</li><li>Replace generic CTAs with one primary action.</li><li>Move the strongest trust proof near the first CTA.</li><li>Add a simple offer block explaining what happens after the click.</li><li>Repeat the conversion action after major sections.</li><li>Rewrite the meta/social description around the outcome.</li><li>Hand this report to your web person or paste the prompts below into AI.</li></ol></section><section class="report-block"><h2>Copy-Paste AI / Freelancer Prompts</h2><p><b>Prompt 1:</b> Using this report, rewrite my homepage hero in five plain-English variants. Keep the goal focused on ${esc(goal)}.</p><p><b>Prompt 2:</b> Turn this report into a one-page implementation brief for a web designer. Include exact sections, button changes, proof placement, and fix order.</p><p><b>Prompt 3:</b> Create 12 CTA button options for this website using the main action: ${esc(action)}.</p><p><b>Prompt 4:</b> Rewrite my proof section so it appears directly under the first CTA and reduces buyer hesitation.</p></section><footer class="report-block report-footer"><p><b>Report ID:</b> ${reportId}</p><p>This is a diagnosis-only product. You own the next step: fix it yourself, hand it off, or use the included prompts.</p></footer></article>`;
  return { reportId, html, subject: `${name} for ${s.host}` };
}
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const { session_id, url, tier = "main", goal = "More leads" } = await req.json();
    const secret = Netlify.env.get("STRIPE_SECRET_KEY");
    let meta: any = { url, tier, goal }, verified = false;
    if (secret && session_id) {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, { headers: { authorization: `Bearer ${secret}` } });
      const session = await res.json();
      if (!res.ok) throw new Error(session.error?.message || "Could not verify checkout");
      if (session.payment_status !== "paid") throw new Error("Checkout is not marked paid yet");
      meta = { ...meta, ...session.metadata, url: session.metadata?.url || url, tier: session.metadata?.tier || tier, goal: session.metadata?.goal || goal };
      verified = true;
    }
    if (!meta.url) return json({ error: "Missing website URL for report generation" }, 400);
    const fetched = await fetchSite(meta.url);
    const signals = extract(fetched.url, fetched.html);
    const report = reportHtml(signals, meta.tier || tier, meta.goal || goal, verified);
    return json({ status: "ready", verified, tier: meta.tier || tier, goal: meta.goal || goal, url: signals.url, host: signals.host, ...report });
  } catch (e: any) {
    return json({ error: e?.message || "Could not generate paid report" }, 500);
  }
};
