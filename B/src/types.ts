/**
 * 共享类型定义
 */

export interface Comment {
  comment_id: string;
  user_name: string;
  rating: number;
  comment_text: string;
  comment_time: string;
  helpful_count: number;
}

export interface NegativeComment extends Comment {
  dimensions?: string[];
  keywords?: string;
}

export interface CrawlParams {
  product_url?: string;
  date_range?: string;
}

export interface CrawlResult {
  product_url: string;
  date_range: string;
  comments: Comment[];
}

export interface Product {
  id: number;
  product_url: string;
  name: string | null;
  created_at: string;
}

export interface DimensionSummary {
  质量?: number;
  服务?: number;
  物流?: number;
  价格?: number;
}

export interface AnalyzeResult {
  negativeList: NegativeComment[];
  summaryByDimension: DimensionSummary;
  fullResult: { items: unknown[]; summary: unknown } | null;
}
