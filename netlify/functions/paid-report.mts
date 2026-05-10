import type { Config, Context } from "@netlify/functions";

export const config: Config = { path: "/api/paid-report" };

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "RevenueLeakReportsBot/2.0" } });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function tierName(tier: string) {
  if (tier === "quick") return "Quick Leak Scan";
  if (tier === "deep") return "Deep Revenue Intelligence Report";
  return "Revenue Leak Report";
}

async function buildReport(url: string, tier: string, goal: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const text = await fetchText(url);
  const depth = tierName(tier);
  const html = `
    <h1>${escapeHtml(depth)}</h1>
    <p><b>Website:</b> ${escapeHtml(url)}</p>
    <p><b>Main goal:</b> ${escapeHtml(goal)}</p>
    <p>This is an AI-generated written diagnosis based on public website signals. No implementation, calls, account access, analytics configuration, or ongoing consulting are included.</p>
    <h2>Executive Snapshot</h2>
    <p>Your site should make the buyer outcome, next step, and trust proof obvious faster. The fixes below are written so you can use them yourself, hand them to a web person, send them to a freelancer, or paste them into an AI tool.</p>
    <h2>Top Revenue Leaks</h2>
    <ol>
      <li><b>Above-the-fold clarity:</b> Make the hero say who you help, what result they get, and what to do next in one screen.</li>
      <li><b>Button specificity:</b> Replace generic buttons with action-focused buttons tied to the business goal.</li>
      <li><b>Trust proof placement:</b> Put reviews, credentials, guarantees, case results, or years in business near the first call-to-action.</li>
      <li><b>Offer clarity:</b> Add a plain-English block that says what the visitor gets, who it is for, and what happens after they click.</li>
      <li><b>Fix-first order:</b> Start with headline, button, proof, offer clarity, then secondary page improvements.</li>
    </ol>
    <h2>Suggested Button Copy</h2>
    <ul><li>Get My Free Quote</li><li>Book My Consultation</li><li>Check Availability</li><li>See If We Can Help</li></ul>
    <h2>Copy-Paste Instructions</h2>
    <p><b>Prompt 1:</b> Using this report and my goal (${escapeHtml(goal)}), rewrite my homepage hero in 5 plain-English versions.</p>
    <p><b>Prompt 2:</b> Turn this report into a one-page implementation brief for a web designer. Include headline changes, button changes, proof placement, and fix order.</p>
    <p><b>Prompt 3:</b> Create a 7-day checklist for improving my site without rebuilding the whole thing.</p>
    <hr>
    <p>Paid reports are delivered within minutes. This report is a written diagnosis only. No implementation is included.</p>
    <p><small>Public text sample reviewed: ${escapeHtml(text.slice(0, 900))}</small></p>`;
  return { subject: `${depth} for ${host}`, html };
}

async function sendEmail(report: any, to: string, customerEmail: string, reviewMode: boolean) {
  const key = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("FROM_EMAIL") || "Revenue Leak Reports <reports@example.com>";
  if (!key) return false;
  const intro = reviewMode ? `<p><b>Internal review mode:</b> Customer email is ${escapeHtml(customerEmail)}. Review this report, then send/forward the final version.</p><hr>` : "";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject: report.subject, html: intro + report.html })
  });
  return res.ok;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const { session_id, email, url, tier = "main", goal = "Get more leads" } = await req.json();
    const secret = Netlify.env.get("STRIPE_SECRET_KEY");
    let meta: any = { email, url, tier, goal };

    if (secret && session_id) {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, { headers: { authorization: `Bearer ${secret}` } });
      const session = await res.json();
      if (!res.ok) throw new Error(session.error?.message || "Could not verify payment");
      if (session.payment_status !== "paid") throw new Error("Payment is not marked paid yet");
      meta = { ...meta, ...session.metadata, email: session.customer_details?.email || session.metadata?.email || email, url: session.metadata?.url || url, tier: session.metadata?.tier || tier, goal: session.metadata?.goal || goal };
    }

    if (!meta.email || !meta.url) return json({ error: "Missing email or URL for report generation" }, 400);
    let normalized = String(meta.url).trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    const report = await buildReport(normalized, meta.tier || tier, meta.goal || goal);
    const reviewMode = (Netlify.env.get("PAID_REPORT_REVIEW_MODE") || "off").toLowerCase() !== "off";
    const adminEmail = Netlify.env.get("ADMIN_EMAIL");
    const sent = await sendEmail(report, reviewMode && adminEmail ? adminEmail : meta.email, meta.email, reviewMode);
    return json({ status: reviewMode ? "queued_for_internal_review" : "delivered", sent, reviewMode, message: reviewMode ? "Report generated and sent for internal review." : "Report generated and emailed to customer." });
  } catch (e: any) {
    return json({ error: e?.message || "Could not generate paid report" }, 500);
  }
};
