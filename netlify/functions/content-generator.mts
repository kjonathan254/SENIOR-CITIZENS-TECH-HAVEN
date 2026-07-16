import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { prompt } = body;

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Access gate: this tool is for internal/admin use only, not site visitors.
  // Without CONTENT_GENERATOR_KEY set in Netlify env vars, this fails closed
  // (denies everyone) rather than failing open (allowing everyone).
  const requiredKey = process.env.CONTENT_GENERATOR_KEY;
  const providedKey = req.headers.get("x-scth-key");

  if (!requiredKey) {
    console.error("CONTENT_GENERATOR_KEY not configured — denying by default");
    return new Response(
      JSON.stringify({ error: "This tool is not yet configured. Contact the site owner." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!providedKey || providedKey !== requiredKey) {
    return new Response(
      JSON.stringify({ error: "Access key required or incorrect." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Basic length cap — protects against someone finding the key and still
  // trying to run up Groq usage with oversized prompts.
  if (prompt.length > 4000) {
    return new Response(
      JSON.stringify({ error: "Prompt too long (max 4000 characters)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  const modelId = process.env.GROQ_MODEL_ID || "openai/gpt-oss-120b";
  const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Service configuration error. Please contact support." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.75,
        reasoning_effort: "low", // GPT-OSS reasoning tokens count toward max_tokens
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status} — ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Content generation failed. Please try again." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return new Response(
        JSON.stringify({ error: "No content generated. Please try again." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Fetch error:", err);
    return new Response(
      JSON.stringify({ error: "Connection error. Please try again." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config: Config = {
  path: "/api/content-generator",
};
