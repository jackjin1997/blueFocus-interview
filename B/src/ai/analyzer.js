/**
 * LangChain 评论分析：情感分析 + 观点/维度提取
 * 输入评论列表，输出负面列表与按维度汇总
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildBatchCommentPrompt, SYSTEM_PROMPT } from "./prompts.js";

const BATCH_SIZE = 50;
const DEFAULT_MODEL = "gpt-4o-mini";

function getModel() {
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

/**
 * 解析 LLM 返回的 JSON（允许被 markdown 代码块包裹）
 */
function parseJsonOutput(text) {
  let raw = (text || "").trim();
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) raw = codeMatch[1].trim();
  return JSON.parse(raw);
}

/**
 * 分析一批评论，返回结构化结果
 * @param {Array<{ comment_id, user_name, rating, comment_text, comment_time, helpful_count }>} comments
 * @returns {Promise<{ negativeList: array, summaryByDimension: object, fullResult: object }>}
 */
export async function analyzeComments(comments) {
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

  const text = typeof response.content === "string" ? response.content : (response.content && response.content[0]?.text) || "";
  let parsed;
  try {
    parsed = parseJsonOutput(text);
  } catch (e) {
    throw new Error("AI response is not valid JSON: " + text.slice(0, 200));
  }

  const items = parsed.items || [];
  const summary = parsed.summary || {};
  const byDimension = summary.by_dimension || { 质量: 0, 服务: 0, 物流: 0, 价格: 0 };

  const negativeList = [];
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
