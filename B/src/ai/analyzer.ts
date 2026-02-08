/**
 * LangChain 评论分析：情感分析 + 观点/维度提取（基于 LangChain 1.0）
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildBatchCommentPrompt, SYSTEM_PROMPT } from "./prompts.js";
import type { Comment, NegativeComment, DimensionSummary, AnalyzeResult } from "../types.js";

const BATCH_SIZE = 50;
const DEFAULT_MODEL = "gpt-4o-mini";

function getModel(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new ChatOpenAI({
    modelName: DEFAULT_MODEL,
    temperature: 0.1,
    openAIApiKey: apiKey,
  });
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
  if (!comments || comments.length === 0) {
    return { negativeList: [], summaryByDimension: {}, fullResult: null };
  }

  const batch = comments.slice(0, BATCH_SIZE);
  const model = getModel();
  const userPrompt = buildBatchCommentPrompt(batch);

  const response = await model.invoke([
    new SystemMessage({ content: SYSTEM_PROMPT }),
    new HumanMessage({ content: userPrompt }),
  ]);

  const content = response.content;
  const text = typeof content === "string" ? content : (Array.isArray(content) && content[0] && "text" in content[0] ? content[0].text : "") || "";
  let parsed: ReturnType<typeof parseJsonOutput>;
  try {
    parsed = parseJsonOutput(text);
  } catch {
    throw new Error("AI response is not valid JSON: " + text.slice(0, 200));
  }

  const items = parsed.items || [];
  const summary = parsed.summary || {};
  const byDimension: DimensionSummary = summary.by_dimension || { 质量: 0, 服务: 0, 物流: 0, 价格: 0 };

  const negativeList: NegativeComment[] = [];
  items.forEach((item, i) => {
    if (item.sentiment === "负面" && batch[i]) {
      negativeList.push({
        ...batch[i],
        dimensions: item.dimensions || [],
        keywords: item.keywords || "",
      });
    }
  });

  return {
    negativeList,
    summaryByDimension: byDimension,
    fullResult: { items, summary },
  };
}
