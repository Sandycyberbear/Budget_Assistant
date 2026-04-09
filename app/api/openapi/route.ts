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

const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
  required: ["error"],
} as const;

const spendContextSchema = {
  type: "string",
  enum: ["Essentials", "Lifestyle", "Holiday", "Social", "Growth", "Health", "Work & Admin"],
} as const;

const incomeSourceTypeSchema = {
  type: "string",
  enum: ["milk_tea_shop", "bar", "part_time", "online_shop", "other"],
} as const;

const incomeStatusSchema = {
  type: "string",
  enum: ["planned", "confirmed", "received", "cancelled"],
} as const;

const incomeReliabilitySchema = {
  type: "string",
  enum: ["high", "medium", "low"],
} as const;

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
      schemas: {
        ErrorResponse: errorResponseSchema,
        SummaryMetrics: {
          type: "object",
          properties: {
            windowDays: { type: "integer" },
            totalSpend: { type: "number" },
            averageDailySpend: { type: "number" },
            projectedMonthSpend: { type: "number" },
            refundOffset: { type: "number" },
            transactionCount: { type: "integer" },
          },
          required: [
            "windowDays",
            "totalSpend",
            "averageDailySpend",
            "projectedMonthSpend",
            "refundOffset",
            "transactionCount",
          ],
        },
        ContextSummary: {
          type: "object",
          properties: {
            context: spendContextSchema,
            spend: { type: "number" },
            transactionCount: { type: "integer" },
            changeRatio: { type: "number" },
          },
          required: ["context", "spend", "transactionCount", "changeRatio"],
        },
        IncomeEntry: {
          type: "object",
          properties: {
            id: { type: "integer" },
            sourceType: incomeSourceTypeSchema,
            shiftStart: { type: "string", format: "date-time" },
            shiftEnd: { type: "string", format: "date-time" },
            expectedAmount: { type: "number" },
            actualAmount: { type: ["number", "null"] },
            status: incomeStatusSchema,
            reliability: incomeReliabilitySchema,
            payoutDate: { type: "string", format: "date" },
            note: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: [
            "id",
            "sourceType",
            "shiftStart",
            "shiftEnd",
            "expectedAmount",
            "actualAmount",
            "status",
            "reliability",
            "payoutDate",
            "note",
            "createdAt",
          ],
        },
        ExpenseRecord: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            amount: { type: "number" },
            originalAmount: { type: "number" },
            date: { type: "string", format: "date" },
            categories: { type: "array", items: { type: "string" } },
            comment: { type: "string" },
            paymentMethod: { type: ["string", "null"] },
            refunded: { type: "boolean" },
            context: spendContextSchema,
          },
          required: [
            "id",
            "name",
            "amount",
            "originalAmount",
            "date",
            "categories",
            "comment",
            "paymentMethod",
            "refunded",
            "context",
          ],
        },
        BehaviorSignal: {
          type: "object",
          properties: {
            title: { type: "string" },
            detail: { type: "string" },
            severity: { type: "string", enum: ["alert", "watch", "positive"] },
          },
          required: ["title", "detail", "severity"],
        },
        SourcePerformance: {
          type: "object",
          properties: {
            sourceType: incomeSourceTypeSchema,
            shifts: { type: "integer" },
            totalActual: { type: "number" },
            totalExpected: { type: "number" },
            averageActual: { type: "number" },
            averageExpected: { type: "number" },
            averageHours: { type: "number" },
            reliabilityScore: { type: "number" },
          },
          required: [
            "sourceType",
            "shifts",
            "totalActual",
            "totalExpected",
            "averageActual",
            "averageExpected",
            "averageHours",
            "reliabilityScore",
          ],
        },
        CashflowSnapshot: {
          type: "object",
          properties: {
            monthSpend: { type: "number" },
            projectedMonthSpend: { type: "number" },
            confirmedInflow: { type: "number" },
            weightedPlannedInflow: { type: "number" },
            next14DaySupport: { type: "number" },
            next14DayProjectedSpend: { type: "number" },
            sourcePerformance: {
              type: "array",
              items: { $ref: "#/components/schemas/SourcePerformance" },
            },
            upcomingIncome: {
              type: "array",
              items: { $ref: "#/components/schemas/IncomeEntry" },
            },
          },
          required: [
            "monthSpend",
            "projectedMonthSpend",
            "confirmedInflow",
            "weightedPlannedInflow",
            "next14DaySupport",
            "next14DayProjectedSpend",
            "sourcePerformance",
            "upcomingIncome",
          ],
        },
        ParsedPurchasePrompt: {
          type: "object",
          properties: {
            rawPrompt: { type: "string" },
            itemName: { type: "string" },
            amount: { type: "number" },
            desiredContext: spendContextSchema,
            urgency: { type: "string", enum: ["low", "medium", "high"] },
            isAmountInferred: { type: "boolean" },
            isContextInferred: { type: "boolean" },
            isUrgencyDefaulted: { type: "boolean" },
            isItemNameInferred: { type: "boolean" },
            missingFields: {
              type: "array",
              items: { type: "string", enum: ["itemName", "amount"] },
            },
            unparsedRemainder: { type: "string" },
          },
          required: [
            "rawPrompt",
            "desiredContext",
            "urgency",
            "isAmountInferred",
            "isContextInferred",
            "isUrgencyDefaulted",
            "isItemNameInferred",
            "missingFields",
          ],
        },
        PurchaseAdviceResponse: {
          type: "object",
          properties: {
            verdict: { type: "string", enum: ["可以买", "谨慎买", "暂缓买", "还缺价格"] },
            desiredContext: spendContextSchema,
            summary: { type: "string" },
            reasons: { type: "array", items: { type: "string" } },
            riskFlags: { type: "array", items: { type: "string" } },
            suggestedActions: { type: "array", items: { type: "string" } },
            affordabilityScore: { type: "number" },
            analysisMode: { type: "string", enum: ["full", "needs_amount"] },
            parsedPrompt: { $ref: "#/components/schemas/ParsedPurchasePrompt" },
          },
          required: [
            "verdict",
            "desiredContext",
            "summary",
            "reasons",
            "riskFlags",
            "suggestedActions",
            "affordabilityScore",
            "analysisMode",
            "parsedPrompt",
          ],
        },
        BudgetSnapshotResponse: {
          type: "object",
          properties: {
            windowDays: { type: "integer" },
            notion: {
              type: "object",
              properties: {
                configured: { type: "boolean" },
                message: { type: "string" },
              },
              required: ["configured", "message"],
            },
            summary: { $ref: "#/components/schemas/SummaryMetrics" },
            contexts: {
              type: "array",
              items: { $ref: "#/components/schemas/ContextSummary" },
            },
            cashflow: { $ref: "#/components/schemas/CashflowSnapshot" },
            signals: {
              type: "array",
              items: { $ref: "#/components/schemas/BehaviorSignal" },
            },
            recentExpenses: {
              type: "array",
              items: { $ref: "#/components/schemas/ExpenseRecord" },
            },
            recentIncome: {
              type: "array",
              items: { $ref: "#/components/schemas/IncomeEntry" },
            },
          },
          required: [
            "windowDays",
            "notion",
            "summary",
            "contexts",
            "cashflow",
            "signals",
            "recentExpenses",
            "recentIncome",
          ],
        },
        IncomeShiftResponse: {
          type: "object",
          properties: {
            entry: { $ref: "#/components/schemas/IncomeEntry" },
            recentIncome: {
              type: "array",
              items: { $ref: "#/components/schemas/IncomeEntry" },
            },
          },
          required: ["entry", "recentIncome"],
        },
      },
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
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BudgetSnapshotResponse" },
                },
              },
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
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CashflowSnapshot" },
                },
              },
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
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PurchaseAdviceResponse" },
                },
              },
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
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/IncomeShiftResponse" },
                },
              },
            },
          },
        }),
      },
    },
  });
}
