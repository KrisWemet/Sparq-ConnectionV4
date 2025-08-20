import { MODEL_MAP, TaskKind } from "./models";
import { chatWithFallback } from "./openrouter";

export type AskOptions = {
  task: TaskKind;
  system?: string;
  temperature?: number;
  max_tokens?: number;
};

export async function askModel(
  userPrompt: string,
  opts: AskOptions
): Promise<string> {
  const { task, system, temperature, max_tokens } = opts;
  const mapping = MODEL_MAP[task];
  const models = [mapping.primary, ...mapping.fallback];
  const messages = [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    { role: "user" as const, content: userPrompt },
  ];
  return chatWithFallback(models, messages, { temperature, max_tokens });
}
