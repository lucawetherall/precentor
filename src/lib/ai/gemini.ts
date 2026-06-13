import "server-only";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { LLMProvider, SuggestionContext, MusicSuggestion } from "./types";

// Cap Gemini latency — a hung external model should not hang an API request.
const GEMINI_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

const suggestionSchema: Schema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.STRING, description: "Database ID or hymn book reference (e.g. NEH-30)" },
      title: { type: SchemaType.STRING, description: "Display title" },
      reason: { type: SchemaType.STRING, description: "Why this piece suits the liturgical context" },
    },
    required: ["id", "title", "reason"],
  },
};

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fail clearly at the call site (the route catches and 503s) rather than
      // surfacing an opaque error from deep inside the Gemini client.
      logger.error("[gemini] GEMINI_API_KEY is not configured");
      throw new Error("AI provider is not configured");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async suggestMusic(context: SuggestionContext): Promise<MusicSuggestion[]> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: suggestionSchema,
      },
    });

    const prompt = this.buildPrompt(context);
    const result = await withTimeout(
      model.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      "Gemini suggestion request",
    );
    const text = result.response.text();

    try {
      return JSON.parse(text) as MusicSuggestion[];
    } catch {
      logger.error("Failed to parse Gemini response", text);
      return [];
    }
  }

  private buildPrompt(ctx: SuggestionContext): string {
    const readingsList = ctx.readings
      .map((r) => `${r.position}: ${r.reference}`)
      .join("\n");

    const recentList = ctx.recentPerformances
      .map((r) => `${r.title} (${r.date})`)
      .join(", ");

    return `You are a Director of Music at a Church of England parish.
Given the following liturgical context, suggest 5 appropriate pieces for the "${ctx.slotType}" slot.

Liturgical Day: ${ctx.liturgicalName}
Season: ${ctx.season} (${ctx.colour})
Readings:
${readingsList}
${ctx.collect ? `Collect: ${ctx.collect}` : ""}

Available hymn books: ${ctx.availableBooks.join(", ")}
Recently performed (avoid repeating): ${recentList || "None"}

Return exactly 5 suggestions as a JSON array. Each must have an "id" (use the hymn book and number, e.g. "NEH-30" or "AM-142", or for anthems use the title), "title" (full display title), and "reason" (brief explanation of liturgical fit).
Prioritise pieces whose text directly relates to the readings. Avoid pieces performed in the last 6 weeks.`;
  }
}
