import type { Config, Context } from "@netlify/functions";

export const config: Config = { path: "/api/scan-preview" };

type Finding = { title: string; detail: string; fix: string };

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function clean(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(html: string, re: RegExp) {
  const m = html.match(re);
  return m ? clean(m[1] || "") : "";
}

function extractButtons(html: string) {
  const out = new Set<string>();
  const patterns = [/<button[^>]*>([\s\S]*?)<\/button>/gi, /<a[^>]*>([\s\S]*?)<\/a>/gi];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) && out.size < 16) {
      const value = clean(match[1] || "");
      if (value && value.length < 60) out.add(value);
    }
  }
  return Array.from(out);
}

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function normalizeUrl(input: string) {
  let value = String(input || "").trim();
  if (!value) throw new Error("Website URL is required.");
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const parsed = new URL(value);
  parsed.hash = "";
  return parsed.toString();
}

async function fetchHomepage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "RevenueLeakReportsBot/2.0" }
    });
    if (!res.ok) throw new Error(`Website returned ${res.status}.`);
    return (await res.text()).slice(0, 300000);
  } finally {
    clearTimeout(timeout);
  }
}

function buildReport(url: string, email: string, goal: string, html: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const meta =
    pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ||
    pick(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const h1 = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h2 = pick(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const buttons = extractButtons(html);
  const text = clean(html).slice(0, 12000);
  const all = `${title} ${meta} ${h1} ${h2} ${buttons.join(" ")} ${text}`;

  const findings: Finding[] = [];
  const vagueHeadline = !h1 || h1.length < 18 || includesAny(h1, ["welcome", "solutions", "services", "quality", "trusted", "best"]);
  if (vagueHeadline) {
    findings.push({
      title: "Your headline may not say what you do or who you help.",
      detail: h1
        ? `Your main headline appears to be: "${h1.slice(0, 120)}." It may be too broad for a cold visitor who is deciding whether this page is for them.`
        : "We could not find a clear main headline in the public page code. That can make the first impression weaker for visitors and search engines.",
      fix: "Rewrite the top line so it names the customer, the problem, and the outcome in plain English."
    });
  }

  const weakCtas = buttons.filter((b) => /learn more|read more|submit|click here|contact|home|more info/i.test(b));
  if (!buttons.length || weakCtas.length) {
    findings.push({
      title: "Your main button may be too vague.",
      detail: buttons.length
        ? `We found button/link language like: ${buttons.slice(0, 5).join(", ")}. Vague buttons can make people browse instead of take the action that creates revenue.`
        : "We could not find a clear button or call-to-action in the public page code.",
      fix: goal.toLowerCase().includes("call")
        ? "Use action-specific button copy like 'Book a Call' or 'Call Now.'"
        : goal.toLowerCase().includes("lead")
          ? "Use action-specific button copy like 'Get My Free Quote' or 'Request Pricing.'"
          : "Use action-specific button copy like 'Get Started' or 'Check Availability.'"
    });
  }

  const trust = includesAny(all, ["review", "testimonial", "licensed", "insured", "guarantee", "years", "clients", "case study", "stars", "rated", "certified", "award", "results"]);
  if (!trust) {
    findings.push({
      title: "Your trust proof may not show up early enough.",
      detail: "We did not see obvious public trust signals such as reviews, credentials, guarantees, client results, ratings, or years in business in the first signals we scanned.",
      fix: "Move your strongest proof near the first call-to-action so visitors see a reason to believe you before they decide to leave."
    });
  }

  const leadPath = /<form|type=["']tel|mailto:|phone|call now|schedule|book|quote|estimate|appointment/i.test(html);
  if (!leadPath) {
    findings.push({
      title: "Your lead path may not be obvious enough.",
      detail: "We did not detect a clear public form, phone action, booking path, or email link in the scanned code. If the next step is hard to find, motivated visitors can still disappear.",
      fix: "Put one clear next step near the top of the page and repeat it after each major section."
    });
  }

  if (!meta || meta.length < 70) {
    findings.push({
      title: "Your search preview may not be doing enough selling.",
      detail: meta ? `Your meta description appears short or thin: "${meta.slice(0, 160)}."` : "We could not detect a strong meta description in the public page code.",
      fix: "Write a simple search description that says who you help, what result you create, and what the visitor should do next."
    });
  }

  while (findings.length < 3) {
    findings.push({
      title: "Your page may need a stronger reason to act now.",
      detail: "Even if the site explains the business, visitors still need to know why they should contact you now instead of later or compare more options.",
      fix: "Add a simple urgency or value statement near the CTA, such as a fast quote, limited availability, free estimate, or specific first step."
    });
  }

  let score = 8;
  if (vagueHeadline) score -= 1;
  if (!trust) score -= 1;
  if (!leadPath) score -= 1;
  if (!meta || meta.length < 70) score -= 1;
  if (weakCtas.length) score -= 1;
  score = Math.max(4, Math.min(8, score));

  return {
    url,
    host,
    email,
    goal,
    score,
    scoreLabel: `${score}/10`,
    findings: findings.slice(0, 3),
    title,
    meta,
    detectedButtons: buttons.slice(0, 8),
    deliveredMessage: "Your free preview is also being sent to your inbox. Paid reports are delivered within minutes."
  };
}

async function maybeEmailPreview(report: any) {
  const key = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("FROM_EMAIL");
  if (!key || !from || !report.email) return false;

  const text = `Your Revenue Leak Preview for ${report.url}\n\nLeak Score: ${report.score}/10\nGoal: ${report.goal}\n\n${report.findings
    .map((f: any, i: number) => `${i + 1}. ${f.title}\n${f.detail}\nTry this: ${f.fix}`)
    .join("\n\n")}\n\nPaid reports are delivered within minutes and include a complete written diagnosis plus plain-English fix instructions.`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: report.email, subject: "Your Revenue Leak Preview is ready", text })
  });
  return res.ok;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { url, email, goal = "More leads" } = await req.json();
    if (!url || !email) return json({ error: "URL and email required" }, 400);
    if (!String(email).includes("@")) return json({ error: "Valid email required" }, 400);

    const normalized = normalizeUrl(url);
    let html = "";
    try {
      html = await fetchHomepage(normalized);
    } catch (e) {
      html = `<title>${normalized}</title><h1>Website scan fallback</h1>`;
    }

    const report = buildReport(normalized, email, goal, html);
    try {
      await maybeEmailPreview(report);
    } catch (e) {
      console.log("Email preview failed", e);
    }
    return json(report);
  } catch (error: any) {
    return json({ error: error?.message || "Could not generate preview" }, 500);
  }
};
