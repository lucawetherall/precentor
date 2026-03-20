import type { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini";

export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "gemini";

  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    default:
      return new GeminiProvider();
  }
}
