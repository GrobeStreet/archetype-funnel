import type { Config, Context } from "@netlify/functions";

export const config: Config = { path: "/api/preview" };

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const body = await req.json();
    const res = await fetch(new URL("/api/scan-preview", req.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return json(data, res.status);
  } catch (e: any) {
    return json({ error: e?.message || "Could not generate preview" }, 500);
  }
};
