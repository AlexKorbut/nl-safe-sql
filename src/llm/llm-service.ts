import OpenAI from "openai";
import { buildSystemPrompt } from "./prompt.js";

export interface LlmServiceOptions {
  apiKey: string;
  model?: string;
}

export class LlmService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: LlmServiceOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? "gpt-4o-mini";
  }

  async parseQuestion(question: string): Promise<unknown> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: question },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned empty response");
    }

    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error("LLM returned invalid JSON");
    }
  }
}

export type IntentParser = (question: string) => Promise<unknown>;