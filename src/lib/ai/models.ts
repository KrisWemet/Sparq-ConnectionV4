export type TaskKind =
  | "creative_longform"      // e.g., Connection Quests teaching content
  | "structured_generation"  // daily questions, short guidance
  | "classification"         // safety/tones/tags
  | "reasoning_safety";      // high-stakes checks or sensitive flows

// ⚠️ Replace models below with your preferred OpenRouter models as needed.
// These IDs are examples that are commonly available via OpenRouter.
export const MODEL_MAP: Record<TaskKind, { primary: string; fallback: string[] }> = {
  creative_longform: {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: ["openai/gpt-4o-mini", "meta-llama/llama-3.1-405b-instruct"],
  },
  structured_generation: {
    primary: "openai/gpt-4o-mini",
    fallback: ["meta-llama/llama-3.1-405b-instruct"],
  },
  classification: {
    primary: "openai/gpt-4o-mini",
    fallback: ["meta-llama/llama-3.1-405b-instruct"],
  },
  reasoning_safety: {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: ["openai/gpt-4o-mini"],
  },
};
