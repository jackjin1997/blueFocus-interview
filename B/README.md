# 电商负面评论监测 AI 应用（B）

基于 **LangChain 1.0** + **TypeScript** + **Fastify** 的电商负面评论监测应用：支持多商品持续监测、AI 情感分析与问题维度提取、定期报告与历史趋势查看。

## 功能概览

- **监测商品管理**：录入/删除需要监测的电商商品链接。
- **自动化监测**：每日定时（默认 8:00）拉取评论并分析；也可在页面上「执行一次监测」立即跑全量。
- **智能分析**：使用 LangChain + OpenAI 对评论做情感判断（正面/负面/中性）及问题维度提取（质量、服务、物流、价格）。
- **报告与趋势**：查看历史报告列表、报告详情（含负面摘要与维度分布）、按日聚合的负面数趋势。

## 环境要求

- **Node.js** >= 20
- **pnpm**（推荐）或 npm / yarn

## 环境搭建

### 1. 安装依赖

```bash
cd B
pnpm install
```

**说明**：存储使用 JSON 文件（`data/products.json`、`data/snapshots.json`、`data/reports.json`），无需原生编译或额外数据库。

### 2. 配置环境变量

复制示例配置并填写必填项：

```bash
cp .env.example .env
```

编辑 `.env`：

- `OPENAI_API_KEY`：必填，用于 LangChain 调用的 OpenAI API Key。
- `PORT`：可选，默认 3000。
- `CRON_DAILY`：可选，默认 `0 8 * * *`（每日 8:00）。
- 数据目录为 `./data`（商品、快照、报告 JSON 文件）。

### 3. 启动应用

**开发模式**（TypeScript 热重载）：

```bash
pnpm dev
```

浏览器访问：**http://localhost:3000**（或你配置的端口）。

**生产运行**：先编译再启动：

```bash
pnpm build
pnpm start
```

若 `pnpm build` 因依赖（如 zod）类型报错失败，可改用：`pnpm build:esbuild` 再 `pnpm start`（需已安装依赖）。

## 功能操作指南

### 添加监测商品

1. 打开首页「监测商品」区域。
2. 填写「商品链接」（必填，如 `https://example.com/product/1`），可选填写「名称」。
3. 点击「添加监测」。同一链接不可重复添加。

### 执行一次监测

1. 在「立即监测」区域点击「执行一次监测」。
2. 系统会对当前已添加的所有商品：调用 Mock 爬虫拉取评论 → AI 分析 → 写入报告。
3. 执行结果会显示在页面；报告列表与趋势会自动刷新。

### 查看报告列表

- 在「报告列表」中查看所有报告（日期、商品、负面数）。
- 使用「按商品筛选」可只显示某一商品的报告。
- 点击某条报告的「查看」可打开报告详情（负面摘要、维度分布、完整报告内容）。

### 查看趋势

- 「趋势」区域展示按报告日期聚合的负面评论数（及报告数）。
- 可选择「全部商品」或指定商品查看近 30 天趋势。

### API 说明

- `GET /api/products`：商品列表
- `POST /api/products`：添加商品，body `{ "product_url": "...", "name": "..." }`
- `GET /api/products/:id`：商品详情
- `DELETE /api/products/:id`：删除商品
- `GET /api/reports?product_id=&limit=`：报告列表
- `GET /api/reports/:id`：报告详情
- `GET /api/trends?product_id=&days=`：趋势数据
- `POST /api/monitor/run`：触发一次全量监测

## 配置说明

| 变量 | 说明 | 默认 |
|------|------|------|
| OPENAI_API_KEY | OpenAI API Key（必填） | - |
| PORT | HTTP 端口 | 3000 |
| CRON_DAILY | 每日监测 cron 表达式 | 0 8 * * * |
| DATA_DIR | 数据目录 | ./data |
| DB_PATH | SQLite 文件路径 | ./data/monitor.db |

Mock 评论数据来自 `data/mockComments.json`，无需配置；如需更换数据，直接替换该 JSON 文件即可（格式需符合题目协议：`comment_id, user_name, rating, comment_text, comment_time, helpful_count`）。

## 设计文档

详见 [DESIGN.md](./DESIGN.md)，包含：

- 整体架构图与数据流程图
- AI 分析逻辑（输入输出、Prompt、情感与维度判定）
- 数据库表结构与关系说明
- 报告推送扩展思路

## 部署说明

- 本地：在 B 目录执行 `pnpm install`、`pnpm build`、`pnpm start`，通过 `http://localhost:PORT` 访问。
- 若部署到云主机：使用进程守护（如 pm2）或容器运行 `node dist/index.js`（需先执行 `pnpm build`），并配置 `OPENAI_API_KEY` 与 `PORT`；如需公网访问，请自行配置反向代理与 HTTPS。
