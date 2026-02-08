/**
 * AI 分析用 prompt 模板
 */

import type { Comment } from "../types.js";

export const SYSTEM_PROMPT = `你是一个电商评论分析助手。你的任务是对用户提供的商品评论进行：
1. 情感判断：对每条评论判断为 正面 / 负面 / 中性。
2. 负面评论关键问题提取：若为负面，提取涉及的问题维度（质量、服务、物流、价格中的一个或多个）并给出简短关键词或摘要。

判定标准：
- 正面：明确表扬、满意、推荐、好评、点赞等。
- 负面：批评、不满、投诉、差评、质量问题、服务差、物流慢、价格贵等。
- 中性：无明显倾向或混合正负。

问题维度说明：
- 质量：产品本身质量、做工、耐用性、与描述是否一致、正品与否等。
- 服务：客服态度、售后、退换货、响应速度等。
- 物流：配送速度、包装、破损、丢件等。
- 价格：性价比、贵、虚高、活动套路等。

请严格按照 JSON 格式输出，不要输出其他说明文字。`;

export function buildBatchCommentPrompt(comments: Comment[]): string {
  const list = comments
    .slice(0, 50)
    .map((c, i) => `[${i + 1}] (评分:${c.rating}) ${c.comment_text}`)
    .join("\n");
  return `请对以下电商评论逐条分析情感并提取负面问题维度。每条评论已标注 [序号] 和 评分。

评论列表：
${list}

请输出一个 JSON 对象，格式如下（不要包含其他内容）：
{
  "items": [
    {
      "index": 1,
      "sentiment": "正面|负面|中性",
      "dimensions": ["质量","服务","物流","价格"] 或 [],
      "keywords": "简短关键词，仅负面时填写"
    }
  ],
  "summary": {
    "negative_count": 数字,
    "by_dimension": { "质量": 数量, "服务": 数量, "物流": 数量, "价格": 数量 }
  }
}`;
}
