import type { DimensionSummary } from "./types.js";

export const MSG_NOT_FOUND = "Not found";
export const MSG_PRODUCT_URL_EXISTS = "商品链接已存在";
export const MSG_PRODUCT_URL_REQUIRED = "product_url required";

export const BATCH_SIZE = 50;
export const MAX_NEGATIVE_COMMENTS_IN_REPORT = 50;

export const DEFAULT_DIMENSION_SUMMARY: DimensionSummary = {
  质量: 0,
  服务: 0,
  物流: 0,
  价格: 0,
};
