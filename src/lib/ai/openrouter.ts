import { env } from "@/lib/config/environment";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatParams = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stop?: string[]; // optional
};

export async function chatOnce(params: ChatParams): Promise<string> {
  if (!env.OPENROUTER_API_KEY) {
    return "AI is temporarily unavailable (missing OPENROUTER_API_KEY).";
  }
  const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      // These headers are recommended by OpenRouter (helpful, optional):
      "HTTP-Referer": env.OPENROUTER_APP_URL,
      "X-Title": env.OPENROUTER_APP_NAME,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1024,
      // stream: false  // (we can add streaming later)
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error (${res.status}): ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : JSON.stringify(content ?? "");
}

export async function chatWithFallback(
  models: string[],
  messages: ChatMessage[],
  opts?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  let lastErr: unknown = null;
  for (const model of models) {
    try {
      return await chatOnce({ model, messages, ...opts });
    } catch (err) {
      lastErr = err;
      // Try next model on rate limit or server errors
      continue;
    }
  }
  throw lastErr ?? new Error("All model attempts failed");
}
