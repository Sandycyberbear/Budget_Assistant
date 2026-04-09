# Budget Assistant

Private spending analysis and purchase guidance for the `Simple Budget` Notion page, with a local `Income` module for shifts and side-hustle cashflow.

## What it does

- Reads expenses from Notion `Expenses` data source
- Re-maps raw categories into decision contexts:
  - `Essentials`
  - `Lifestyle`
  - `Holiday`
  - `Social`
  - `Growth`
  - `Health`
  - `Work & Admin`
- Tracks local income shifts in SQLite
- Shows recent spend patterns, hot contexts, monthly cashflow, and upcoming income support
- Answers purchase questions such as `我能买 80 欧的护肤品吗？`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and fill in your Notion token:

```bash
cp .env.example .env.local
```

3. In `.env.local`, set:
- `NOTION_API_TOKEN`
- `NOTION_EXPENSES_DATA_SOURCE_ID`
- `API_BEARER_TOKEN`
- optional local `DATABASE_PATH` if you do not want the default `./data/budget-assistant.sqlite`

4. In Notion:
- create or reuse an integration
- share the `Expenses` database with that integration
- set `NOTION_API_TOKEN`
- keep `NOTION_EXPENSES_DATA_SOURCE_ID` as `d8fc924d-b1e4-4ae4-bd66-0132c5997028` unless you move the data source

5. Start the app:

```bash
npm run dev
```

## API surface

- `GET /api/summary?window=30|90|180`
- `GET /api/trends?granularity=day|month`
- `GET /api/categories?window=30|90`
- `GET /api/cashflow`
- `POST /api/purchase-advice`
- `POST /api/income`

## ChatGPT Actions

- OpenAPI schema endpoint: `GET /api/openapi`
- Tool-friendly endpoints:
  - `GET /api/tools/budget-snapshot`
  - `GET /api/tools/spending-trends`
  - `GET /api/tools/context-breakdown`
  - `GET /api/tools/cashflow-outlook`
  - `POST /api/tools/purchase-advice`
  - `POST /api/tools/income-shifts`

Protected tool endpoints require:

```http
Authorization: Bearer <API_BEARER_TOKEN>
```

For a custom GPT or Actions-style tool connection, deploy the app to a public HTTPS URL and use `/api/openapi` as the imported schema.

## MCP server

Run the MCP server over stdio:

```bash
npm run mcp
```

Exposed MCP tools:

- `get_budget_snapshot`
- `get_spending_trends`
- `get_context_breakdown`
- `get_cashflow_outlook`
- `get_purchase_advice`
- `add_income_shift`

## Local data

- Expenses stay read-only in Notion.
- Income is stored locally in SQLite at `DATABASE_PATH` or `./data/budget-assistant.sqlite`.

## Railway deploy

This repo includes:
- `Dockerfile` for a standalone Next.js production image
- `railway.json` for Docker deploy + healthcheck
- `GET /api/health` for Railway healthchecks

### 1. Push to GitHub

Railway deploys this repo from GitHub, so push your latest changes first.

### 2. Create the Railway service

- Create a new Railway project from the GitHub repo
- Let Railway build from the root `Dockerfile`
- Generate the default public Railway domain (`*.up.railway.app`)

### 3. Attach a volume

- Create a Railway volume
- Mount it at `/data`

### 4. Set Railway environment variables

```bash
NOTION_API_TOKEN=ntn_your_real_token
BUDGET_ASSISTANT_NOTION_API_TOKEN=optional_fallback_if_needed
NOTION_EXPENSES_DATA_SOURCE_ID=d8fc924d-b1e4-4ae4-bd66-0132c5997028
BUDGET_ASSISTANT_NOTION_EXPENSES_DATA_SOURCE_ID=optional_fallback_if_needed
DATABASE_PATH=/data/budget-assistant.sqlite
API_BEARER_TOKEN=use_a_long_random_secret_here
BUDGET_ASSISTANT_API_BEARER_TOKEN=optional_fallback_if_needed
HOSTNAME=0.0.0.0
```

### 5. Verify the deployment

- `https://<your-railway-domain>/api/health`
- `https://<your-railway-domain>/api/openapi`
- `GET /api/tools/budget-snapshot` without auth should return `401`
- the same request with `Authorization: Bearer <API_BEARER_TOKEN>` should return `200`

## ChatGPT Actions post-deploy checklist

1. In the GPT builder, add an Action.
2. Import the schema from:

```text
https://<your-railway-domain>/api/openapi
```

3. Configure auth as a Bearer / API key style header:

```http
Authorization: Bearer <API_BEARER_TOKEN>
```

4. Run one read test:
- `GET /api/tools/budget-snapshot`

5. Run one write test:
- `POST /api/tools/income-shifts`

6. Restart the Railway service once and confirm the saved income entry still exists.

## Tests

```bash
npm run test
```

Build the standalone production bundle with:

```bash
npm run build
```

Run the standalone server locally after building:

```bash
HOSTNAME=0.0.0.0 API_BEARER_TOKEN=test-token npm run start
```
