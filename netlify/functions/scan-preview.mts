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
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
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

function normalizeUrl(input: string) {
  let value = String(input || "").trim();
  if (!value) throw new Error("Website URL is required.");
  value = value.replace(/^https?:\/\//i, "").replace(/^www\./i, "www.");
  if (!value.includes(".")) throw new Error("Enter a real website domain, like trainingties.com.");
  const candidates = [`https://${value}`, `https://www.${value.replace(/^www\./i, "")}`, `http://${value}`];
  return candidates;
}

async function fetchHomepage(input: string) {
  const candidates = normalizeUrl(input);
  let lastError = "Could not read website.";
  for (const url of candidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 RevenueLeakReportsBot/2.1 (+https://revenue-leak-reports.netlify.app)"
        }
      });
      if (!res.ok) {
        lastError = `Website returned ${res.status}.`;
        continue;
      }
      const finalUrl = res.url || url;
      const html = (await res.text()).slice(0, 500000);
      return { url: finalUrl, html };
    } catch (e: any) {
      lastError = e?.message || lastError;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(lastError);
}

function extractButtons(html: string) {
  const out = new Set<string>();
  const patterns = [/<button[^>]*>([\s\S]*?)<\/button>/gi, /<a[^>]*>([\s\S]*?)<\/a>/gi, /aria-label=["']([^"']+)["']/gi, /value=["']([^"']+)["']/gi];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) && out.size < 20) {
      const value = clean(match[1] || "");
      if (value && value.length > 1 && value.length < 70 && !/^\s*(home|skip|menu|facebook|instagram|twitter|linkedin)\s*$/i.test(value)) out.add(value);
    }
  }
  return Array.from(out);
}

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.filter((word) => lower.includes(word));
}

function detectProof(all: string) {
  const proofs = includesAny(all, ["review", "testimonial", "licensed", "insured", "guarantee", "warranty", "years", "clients", "case study", "stars", "rated", "certified", "award", "results", "trusted", "as seen", "featured", "secure checkout", "free shipping"]);
  return Array.from(new Set(proofs)).slice(0, 8);
}

function goalLanguage(goal: string) {
  const g = goal.toLowerCase();
  if (g.includes("product") || g.includes("sales")) return { action: "buy", cta: "Shop the Best Fit", outcome: "more product sales" };
  if (g.includes("call")) return { action: "call", cta: "Book a Call", outcome: "more qualified calls" };
  if (g.includes("booking")) return { action: "book", cta: "Check Availability", outcome: "more bookings" };
  if (g.includes("local")) return { action: "find", cta: "Get My Local Plan", outcome: "better local visibility" };
  return { action: "lead", cta: "Get My Free Quote", outcome: "more leads" };
}

function buildReport(url: string, goal: string, html: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const meta =
    pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) ||
    pick(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    pick(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i);
  const h1 = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => clean(m[1] || "")).filter(Boolean).slice(0, 6);
  const buttons = extractButtons(html);
  const text = clean(html).slice(0, 16000);
  const all = `${title} ${meta} ${h1} ${h2s.join(" ")} ${buttons.join(" ")} ${text}`;
  const proofSignals = detectProof(all);
  const goalWords = goalLanguage(goal);
  const findings: Finding[] = [];

  const headline = h1 || title || "No clear headline detected";
  const vagueHeadline = !h1 || h1.length < 18 || includesAny(h1, ["welcome", "solutions", "services", "quality", "trusted", "best"]).length > 0;
  if (vagueHeadline) {
    findings.push({
      title: "The first message may be too vague for a cold visitor.",
      detail: `We detected this as the main first-impression copy: "${headline.slice(0, 140)}." For a ${goalWords.outcome} goal, the top of the page should quickly say who it is for, what they get, and why to act now.`,
      fix: `Try a sharper structure: "[Specific buyer] gets [specific outcome] without [common frustration]." Then put a clear button like "${goalWords.cta}" beside it.`
    });
  } else {
    findings.push({
      title: "Your headline is readable, but it can probably sell the outcome harder.",
      detail: `We found: "${headline.slice(0, 140)}." That gives us something real to work with, but the paid report can stress-test whether it clearly supports the goal: ${goal}.`,
      fix: `Add a second line under the headline that names the next step and the payoff. Example button: "${goalWords.cta}."`
    });
  }

  const genericButtons = buttons.filter((b) => /learn more|read more|submit|click here|contact|more info|get started/i.test(b));
  if (!buttons.length || genericButtons.length) {
    findings.push({
      title: "Your call-to-action path may be too generic.",
      detail: buttons.length ? `We found button/link text including: ${buttons.slice(0, 7).join(", ")}. Generic CTAs make people browse instead of taking the action that creates revenue.` : "We could not detect strong call-to-action buttons in the public page code.",
      fix: `Use more specific action language tied to ${goal}. Start with "${goalWords.cta}" and repeat the same core action after proof sections.`
    });
  } else {
    findings.push({
      title: "You have visible action links — now make the strongest one impossible to miss.",
      detail: `We detected CTAs such as: ${buttons.slice(0, 7).join(", ")}. The next conversion win is making sure the primary action stands out from navigation and secondary links.`,
      fix: `Choose one main CTA for this page and make it outcome-specific. For this goal, test "${goalWords.cta}."`
    });
  }

  if (!proofSignals.length) {
    findings.push({
      title: "Trust proof may not be doing enough work early in the page.",
      detail: "In the public page text we scanned, we did not see obvious proof words like reviews, testimonials, ratings, guarantees, credentials, or results. Cold visitors need confidence before they click.",
      fix: "Move your strongest proof close to the first CTA: review count, customer quote, guarantee, credential, number of customers, result, or recognizable logo."
    });
  } else {
    findings.push({
      title: "You have trust signals — but placement still matters.",
      detail: `We detected proof-related signals including: ${proofSignals.join(", ")}. The key question is whether visitors see the proof before they decide whether to act.`,
      fix: "Put the strongest proof within the first screen or directly under the first CTA so it supports the click."
    });
  }

  const leadPath = /<form|type=["']tel|mailto:|phone|call now|schedule|book|quote|estimate|appointment|checkout|cart|add to cart|buy now/i.test(html);
  if (!leadPath) {
    findings.push({
      title: "The revenue action may be too hidden.",
      detail: "We did not detect a clear public form, phone action, booking path, quote request, cart, or checkout path in the scanned code. Even motivated visitors can disappear if the next step is not obvious.",
      fix: `Add one clear next step near the top and repeat it after each major section. Use language like "${goalWords.cta}" rather than a vague browse action.`
    });
  }

  if (!meta || meta.length < 70) {
    findings.push({
      title: "Your search/social description may not be pulling its weight.",
      detail: meta ? `The detected description is short or thin: "${meta.slice(0, 170)}."` : "We could not detect a strong meta description from the public page code.",
      fix: `Write a one-sentence description that says who you help, what they get, and the next step. Example: "Get ${goalWords.outcome} from your website with a clearer offer, stronger proof, and a better path to action."`
    });
  }

  while (findings.length < 3) {
    findings.push({
      title: "Your page may need a stronger reason to act now.",
      detail: "Even if the site explains the business, visitors still need to know why they should contact you now instead of later or compare more options.",
      fix: "Add a simple urgency or value statement near the CTA, such as a fast quote, limited availability, free estimate, guarantee, or specific first step."
    });
  }

  let score = 8;
  if (vagueHeadline) score -= 1;
  if (!proofSignals.length) score -= 1;
  if (!leadPath) score -= 1;
  if (!meta || meta.length < 70) score -= 1;
  if (genericButtons.length) score -= 1;
  score = Math.max(4, Math.min(8, score));

  const verdict = score >= 8 ? "Strong base — a few leaks left" : score >= 6 ? "Leaks found — worth fixing" : "Major leaks found — fix these first";

  return {
    url,
    host,
    goal,
    score,
    scoreLabel: `${score}/10`,
    verdict,
    findings: findings.slice(0, 3),
    detected: {
      title,
      headline,
      meta,
      h2s,
      buttons: buttons.slice(0, 10),
      proofSignals,
      leadPathDetected: leadPath
    },
    fullReportPreview: [
      "A deeper scorecard across headline clarity, CTA strength, trust proof, offer clarity, SEO metadata, and buyer path.",
      "More findings ranked by what is most likely to improve calls, leads, bookings, or sales first.",
      "Specific headline, button, proof-section, and offer rewrites based on the actual copy we can read from your page.",
      "Plain-English instructions you can hand to a web person, freelancer, or paste into ChatGPT, Claude, or Gemini."
    ]
  };
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { url, goal = "More leads" } = await req.json();
    if (!url) return json({ error: "URL required" }, 400);
    const fetched = await fetchHomepage(url);
    const report = buildReport(fetched.url, goal, fetched.html);
    return json(report);
  } catch (error: any) {
    return json({ error: error?.message || "Could not generate preview" }, 500);
  }
};
