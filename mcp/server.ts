import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { incomeInputSchema } from "../lib/income-db";
import {
  addIncomeShift,
  contextWindowSchema,
  getBudgetSnapshot,
  getCashflowOutlook,
  getContextBreakdown,
  getSpendingTrends,
  getStructuredPurchaseAdvice,
  purchaseAdviceInputSchema,
  summaryWindowSchema,
  toToolText,
  trendGranularitySchema,
} from "../lib/toolkit";

const server = new McpServer({
  name: "budget-assistant",
  version: "1.0.0",
});

server.registerTool(
  "get_budget_snapshot",
  {
    title: "Get budget snapshot",
    description:
      "Returns budget summary metrics, context breakdown, recent items, signals, and cashflow outlook.",
    inputSchema: {
      windowDays: summaryWindowSchema.optional(),
    },
  },
  async ({ windowDays = 30 }) => {
    const payload = await getBudgetSnapshot(windowDays);
    return {
      content: [{ type: "text", text: toToolText("Budget snapshot", payload) }],
      structuredContent: payload,
    };
  },
);

server.registerTool(
  "get_spending_trends",
  {
    title: "Get spending trends",
    description: "Returns spend and inflow trends by day or month.",
    inputSchema: {
      granularity: trendGranularitySchema.optional(),
    },
  },
  async ({ granularity = "day" }) => {
    const payload = await getSpendingTrends(granularity);
    return {
      content: [{ type: "text", text: toToolText("Spending trends", payload) }],
      structuredContent: { granularity, data: payload },
    };
  },
);

server.registerTool(
  "get_context_breakdown",
  {
    title: "Get context breakdown",
    description: "Returns spend grouped into decision contexts like Essentials, Lifestyle, and Holiday.",
    inputSchema: {
      windowDays: contextWindowSchema.optional(),
    },
  },
  async ({ windowDays = 30 }) => {
    const payload = await getContextBreakdown(windowDays);
    return {
      content: [{ type: "text", text: toToolText("Context breakdown", payload) }],
      structuredContent: { windowDays, data: payload },
    };
  },
);

server.registerTool(
  "get_cashflow_outlook",
  {
    title: "Get cashflow outlook",
    description: "Returns projected month spend, upcoming income, and source performance.",
  },
  async () => {
    const payload = await getCashflowOutlook();
    return {
      content: [{ type: "text", text: toToolText("Cashflow outlook", payload) }],
      structuredContent: payload,
    };
  },
);

server.registerTool(
  "get_purchase_advice",
  {
    title: "Get purchase advice",
    description: "Returns a structured buy / caution / hold recommendation with reasons and risk flags.",
    inputSchema: purchaseAdviceInputSchema.shape,
  },
  async (args) => {
    const payload = await getStructuredPurchaseAdvice(args);
    return {
      content: [{ type: "text", text: toToolText("Purchase advice", payload) }],
      structuredContent: payload,
    };
  },
);

server.registerTool(
  "add_income_shift",
  {
    title: "Add income shift",
    description:
      "Stores an income shift for milk tea shop, bar, part-time work, online shop, or other income sources.",
    inputSchema: incomeInputSchema.shape,
  },
  async (args) => {
    const payload = addIncomeShift(args);
    return {
      content: [{ type: "text", text: toToolText("Income shift saved", payload) }],
      structuredContent: payload,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
