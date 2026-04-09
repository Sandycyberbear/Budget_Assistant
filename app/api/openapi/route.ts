import { NextResponse } from "next/server";

function withBearerSecurity<T extends Record<string, unknown>>(operation: T) {
  return {
    ...operation,
    security: [{ bearerAuth: [] }],
    responses: {
      "401": {
        description: "Missing or invalid bearer token",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
      },
      ...(operation.responses ?? {}),
    },
  };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  const origin = publicDomain ? `https://${publicDomain}` : requestUrl.origin;

  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Budget Assistant Tools API",
      version: "1.0.0",
      description:
        "OpenAPI schema for connecting the Budget Assistant app to ChatGPT Actions or other tool callers.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Use the shared API_BEARER_TOKEN as a bearer token.",
        },
      },
    },
    paths: {
      "/api/tools/budget-snapshot": {
        get: withBearerSecurity({
          operationId: "getBudgetSnapshot",
          summary: "Get a budget snapshot",
          description:
            "Returns summary metrics, context breakdown, cashflow, recent items, and signals for the chosen window.",
          parameters: [
            {
              name: "windowDays",
              in: "query",
              schema: { type: "integer", enum: [30, 90, 180], default: 30 },
            },
          ],
          responses: {
            "200": {
              description: "Budget snapshot payload",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        }),
      },
      "/api/tools/spending-trends": {
        get: withBearerSecurity({
          operationId: "getSpendingTrends",
          summary: "Get spending trends",
          parameters: [
            {
              name: "granularity",
              in: "query",
              schema: { type: "string", enum: ["day", "month"], default: "day" },
            },
          ],
          responses: {
            "200": {
              description: "Spend and inflow trend points",
              content: { "application/json": { schema: { type: "array", items: { type: "object" } } } },
            },
          },
        }),
      },
      "/api/tools/context-breakdown": {
        get: withBearerSecurity({
          operationId: "getContextBreakdown",
          summary: "Get spend grouped by context",
          parameters: [
            {
              name: "windowDays",
              in: "query",
              schema: { type: "integer", enum: [30, 90], default: 30 },
            },
          ],
          responses: {
            "200": {
              description: "Context breakdown payload",
              content: { "application/json": { schema: { type: "array", items: { type: "object" } } } },
            },
          },
        }),
      },
      "/api/tools/cashflow-outlook": {
        get: withBearerSecurity({
          operationId: "getCashflowOutlook",
          summary: "Get current cashflow outlook",
          responses: {
            "200": {
              description: "Cashflow outlook payload",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        }),
      },
      "/api/tools/purchase-advice": {
        post: withBearerSecurity({
          operationId: "getPurchaseAdvice",
          summary: "Get structured purchase advice",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["itemName", "amount", "desiredContext", "urgency"],
                  properties: {
                    itemName: { type: "string" },
                    amount: { type: "number" },
                    desiredContext: {
                      type: "string",
                      enum: ["Essentials", "Lifestyle", "Holiday", "Social", "Growth", "Health", "Work & Admin"],
                    },
                    urgency: { type: "string", enum: ["low", "medium", "high"] },
                    note: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Purchase advice payload",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        }),
      },
      "/api/tools/income-shifts": {
        post: withBearerSecurity({
          operationId: "addIncomeShift",
          summary: "Add a new income shift",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "sourceType",
                    "shiftStart",
                    "shiftEnd",
                    "expectedAmount",
                    "status",
                    "reliability",
                    "payoutDate",
                  ],
                  properties: {
                    sourceType: {
                      type: "string",
                      enum: ["milk_tea_shop", "bar", "part_time", "online_shop", "other"],
                    },
                    shiftStart: { type: "string", format: "date-time" },
                    shiftEnd: { type: "string", format: "date-time" },
                    expectedAmount: { type: "number" },
                    actualAmount: { type: ["number", "null"] },
                    status: { type: "string", enum: ["planned", "confirmed", "received", "cancelled"] },
                    reliability: { type: "string", enum: ["high", "medium", "low"] },
                    payoutDate: { type: "string", format: "date" },
                    note: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Saved income shift payload",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        }),
      },
    },
  });
}
