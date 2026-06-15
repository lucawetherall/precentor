import type { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { env } from "@/lib/env";

export function createLLMProvider(): LLMProvider {
  const provider = env.LLM_PROVIDER;

  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    default:
      return new GeminiProvider();
  }
}
