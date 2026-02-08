import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildBatchCommentPrompt, SYSTEM_PROMPT } from "./prompts.js";
import type { Comment, NegativeComment, DimensionSummary, AnalyzeResult } from "../types.js";
import { BATCH_SIZE, DEFAULT_DIMENSION_SUMMARY } from "../constants.js";

const DEFAULT_MODEL = "gpt-4o-mini";

function getModel(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new ChatOpenAI({
    modelName: DEFAULT_MODEL,
    temperature: 0.1,
    openAIApiKey: apiKey,
  });
}

function getTextFromLLMResponse(content: unknown): string {
  if (typeof content === "string") return content;
  if (
    Array.isArray(content) &&
    content[0] != null &&
    "text" in content[0] &&
    typeof (content[0] as { text: string }).text === "string"
  ) {
    return (content[0] as { text: string }).text;
  }
  return "";
}

interface ParsedAnalysis {
  items: Array<{ sentiment?: string; dimensions?: string[]; keywords?: string }>;
  summary?: { by_dimension?: DimensionSummary };
}

function parseJsonOutput(text: string): ParsedAnalysis {
  let raw = (text || "").trim();
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) raw = codeMatch[1].trim();
  return JSON.parse(raw) as ParsedAnalysis;
}

export async function analyzeComments(comments: Comment[]): Promise<AnalyzeResult> {
  if (!comments?.length) {
    return { negativeList: [], summaryByDimension: { ...DEFAULT_DIMENSION_SUMMARY }, fullResult: null };
  }

  const batch = comments.slice(0, BATCH_SIZE);
  const model = getModel();
  const userPrompt = buildBatchCommentPrompt(batch);

  const response = await model.invoke([
    new SystemMessage({ content: SYSTEM_PROMPT }),
    new HumanMessage({ content: userPrompt }),
  ]);

  const text = getTextFromLLMResponse(response.content);
  let parsed: ParsedAnalysis;
  try {
    parsed = parseJsonOutput(text);
  } catch {
    throw new Error("AI response is not valid JSON: " + text.slice(0, 200));
  }

  const items = parsed.items ?? [];
  const summary = parsed.summary ?? {};
  const byDimension: DimensionSummary = { ...DEFAULT_DIMENSION_SUMMARY, ...summary.by_dimension };

  const negativeList: NegativeComment[] = [];
  items.forEach((item, i) => {
    if (item.sentiment === "负面" && batch[i]) {
      negativeList.push({
        ...batch[i],
        dimensions: item.dimensions ?? [],
        keywords: item.keywords ?? "",
      });
    }
  });

  return {
    negativeList,
    summaryByDimension: byDimension,
    fullResult: { items, summary },
  };
}
