# 电商负面评论监测 AI 应用 - 设计文档

## 1. 整体架构

```mermaid
flowchart LR
  subgraph client [客户端]
    User[用户]
  end
  subgraph app [应用层]
    API[Express API]
    Cron[定时任务]
  end
  subgraph core [核心]
    Mock[Mock 爬虫]
    AI[LangChain 分析]
    Report[报告生成]
  end
  subgraph storage [存储]
    DB[(SQLite)]
    MockData[Mock 评论 JSON]
  end
  User --> API
  User --> Cron
  API --> DB
  Cron --> Mock
  Mock --> MockData
  Cron --> AI
  AI --> Report
  Report --> DB
  API --> DB
```

- **用户**：通过 Web 页面添加监测商品、触发监测、查看报告与趋势。
- **Express API**：提供商品 CRUD、报告列表/详情、趋势、触发监测接口。
- **定时任务**：每日 8:00 对已登记商品执行拉取 → 分析 → 写报告。
- **Mock 爬虫**：从本地 `data/mockComments.json` 按 `product_url`/`date_range` 返回评论，无需真实爬虫。
- **LangChain 分析**：对评论做情感分析（正面/负面/中性）与问题维度提取（质量、服务、物流、价格）。
- **报告生成**：组装负面摘要、维度分布、可读报告内容写入 DB。
- **SQLite**：存储商品、评论快照、报告及趋势查询。

## 2. 数据流程

```mermaid
sequenceDiagram
  participant User
  participant API
  participant Cron
  participant Mock
  participant AI
  participant DB

  User->>API: 添加商品链接
  API->>DB: 写入 products

  Note over Cron: 每日 8:00 或手动触发
  Cron->>DB: 读取 products
  loop 每个商品
    Cron->>Mock: fetchComments(product_url, date_range)
    Mock-->>Cron: comments[]
    Cron->>AI: analyzeComments(comments)
    AI-->>Cron: negativeList, summaryByDimension
    Cron->>DB: insertSnapshot, insertReport
  end

  User->>API: 查看报告列表 / 报告详情 / 趋势
  API->>DB: 查询 reports / trends
  API-->>User: JSON 或页面
```

- **录入**：用户添加商品 URL → 写入 `products`。
- **每日拉取**：定时或手动触发 → 对每个商品调用 Mock 接口拿评论 → 调用 AI 分析 → 写入 `comment_snapshots` 与 `reports`。
- **查看**：报告列表、报告详情、趋势均从 DB 查询返回。

## 3. AI 分析逻辑

### 3.1 输入与输出

- **输入**：一批电商评论（每条含 `comment_id, user_name, rating, comment_text, comment_time, helpful_count`），单次最多 50 条。
- **输出**：
  - `negativeList`：被判定为「负面」的评论列表，并附带维度（质量/服务/物流/价格）与关键词。
  - `summaryByDimension`：各维度的负面数量统计，供报告概览与趋势使用。

### 3.2 Prompt 设计

- **系统 Prompt**：定义角色为电商评论分析助手；明确情感三分类（正面/负面/中性）及四个问题维度（质量、服务、物流、价格）的含义与判定标准。
- **用户 Prompt**：传入评论列表（带序号与评分），要求模型按固定 JSON 结构输出：
  - `items[]`：每条评论的 `sentiment`、`dimensions`、`keywords`。
  - `summary`：`negative_count`、`by_dimension` 各维度数量。

### 3.3 情感与维度判定规则

- **情感**：以用户表达的不满/满意倾向为主；评分 1–2 多为负面参考，但不唯一依据，以评论文本为准。
- **维度**：仅对负面评论标注维度；一条评论可属多个维度（如既抱怨质量又抱怨物流）。

实现位置：`src/ai/prompts.js`（模板）、`src/ai/analyzer.js`（调用 LangChain ChatOpenAI、解析 JSON）。

## 4. 数据库设计

### 4.1 表结构

| 表名 | 说明 |
|------|------|
| products | 监测商品 |
| comment_snapshots | 某次拉取的评论快照 |
| reports | 监测报告 |

### 4.2 products

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| product_url | TEXT UNIQUE | 商品链接 |
| name | TEXT | 可选名称 |
| created_at | TEXT | 创建时间 |

### 4.3 comment_snapshots

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| product_id | INTEGER FK | 关联 products.id |
| date_range_start | TEXT | 统计开始日期 |
| date_range_end | TEXT | 统计结束日期 |
| comment_count | INTEGER | 评论条数 |
| raw_json | TEXT | 原始评论 JSON（可选） |
| created_at | TEXT | 创建时间 |

### 4.4 reports

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| product_id | INTEGER FK | 关联 products.id |
| snapshot_id | INTEGER FK | 关联 comment_snapshots.id（可选） |
| report_date | TEXT | 报告日期 |
| negative_count | INTEGER | 负面评论数 |
| negative_summary | TEXT | 负面摘要文案 |
| dimension_summary | TEXT | 维度统计 JSON |
| content | TEXT | 完整报告内容（Markdown 等） |
| created_at | TEXT | 创建时间 |

### 4.5 关系与索引

- `comment_snapshots.product_id` → `products.id`
- `reports.product_id` → `products.id`，`reports.snapshot_id` → `comment_snapshots.id`
- 索引：`comment_snapshots(product_id)`、`reports(product_id)`、`reports(report_date)`，便于列表与趋势查询。

---

## 5. 报告推送扩展

当前版本通过 **Web 报告列表 + 在线查看/下载** 方式交付报告。若需「推送给客户」，可在现有架构上扩展：

- **邮件推送**：定时任务或报告生成后调用邮件服务，将报告内容或链接发送至配置邮箱。
- **Webhook**：报告生成后向客户配置的 URL 发送 POST，携带报告摘要或链接。

以上扩展点可在 `jobs/dailyMonitor.js` 报告写入 DB 之后增加调用，配置项（邮箱、Webhook URL）建议放在环境变量或配置表中，并在 README 中说明。
