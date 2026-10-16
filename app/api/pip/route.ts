import { NextResponse } from "next/server";
import { jsonError, rateLimited } from "@/lib/server/http";
import { cleanContext, cleanHistory, cleanQuestion, systemPrompt } from "@/lib/pip/prompt";

export const runtime = "nodejs";

// "Ask Pip": optional AI answers through Groq. Off unless GROQ_API_KEY is set; the key never
// leaves the server. Only text is sent (the question, recent chat, the screen's facts), never photos.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
const MAX_PER_HOUR = Number(process.env.PIP_MAX_PER_HOUR || 30);

const groqKey = () => process.env.GROQ_API_KEY?.trim();

/** Whether "Ask Pip" is available. */
export async function GET() {
  return NextResponse.json({ ask: Boolean(groqKey()) });
}

export async function POST(req: Request) {
  const key = groqKey();
  if (!key) return jsonError("pip_off", "Ask Pip isn't switched on for this site.", 404);
  if (rateLimited(req, "pip", MAX_PER_HOUR)) return jsonError("rate_limited", "Pip needs a short break. Try again in a while.", 429);

  const body = await req.json().catch(() => ({}));
  const question = cleanQuestion(body.question);
  if (!question) return jsonError("bad_question", "Ask a question of up to 400 characters.", 400);
  const { screen, facts } = cleanContext(body.context);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt(screen, facts) }, ...cleanHistory(body.history), { role: "user", content: question }],
        temperature: 0.5,
        max_completion_tokens: 600,
        // gpt-oss models think first; keep it short and leave the reasoning out of the response.
        ...(MODEL.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[hairpath] Ask Pip failed:", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return jsonError("pip_unavailable", "Pip couldn't answer just now. Try again in a moment.", 502);
    }
    const data = await res.json();
    const answer = typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content.trim() : "";
    if (!answer) return jsonError("pip_unavailable", "Pip couldn't answer just now. Try again in a moment.", 502);
    return NextResponse.json({ answer: answer.slice(0, 1200) });
  } catch (e) {
    console.warn("[hairpath] Ask Pip unreachable:", e instanceof Error ? e.message : e);
    return jsonError("pip_unavailable", "Pip couldn't answer just now. Try again in a moment.", 502);
  }
}
