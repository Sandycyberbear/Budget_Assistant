import { z } from "zod";

import { buildPurchaseAdvice, getCashflowSnapshot, getContextSummaries, getDailyTrend, getMonthlyTrend, getSummaryMetrics } from "@/lib/analysis";
import { getDashboardData } from "@/lib/dashboard-data";
import { createIncomeEntry, incomeInputSchema, listAllIncomeEntries, listIncomeEntries } from "@/lib/income-db";
import { getExpenseRecords } from "@/lib/notion";
import { spendContexts } from "@/lib/types";

export const summaryWindowSchema = z.union([z.literal(30), z.literal(90), z.literal(180)]);
export const contextWindowSchema = z.union([z.literal(30), z.literal(90)]);
export const trendGranularitySchema = z.enum(["day", "month"]);

export const purchaseAdviceInputSchema = z.object({
  itemName: z.string().min(1),
  amount: z.number().positive(),
  desiredContext: z.enum(spendContexts),
  urgency: z.enum(["low", "medium", "high"]),
  note: z.string().optional(),
});

async function buildSummary(windowDays: 30 | 90 | 180) {
  const expenses = await getExpenseRecords();
  return getSummaryMetrics(expenses, windowDays);
}

export async function getBudgetSnapshot(windowDays: 30 | 90 | 180 = 30) {
  const dashboard = await getDashboardData();
  const expenses = await getExpenseRecords();

  return {
    windowDays,
    notion: {
      configured: dashboard.isNotionConfigured,
      message: dashboard.notionMessage,
    },
    summary:
      windowDays === 30
        ? dashboard.summary30
        : windowDays === 90
          ? dashboard.summary90
          : await buildSummary(windowDays),
    contexts:
      windowDays === 30
        ? dashboard.contexts30
        : windowDays === 90
          ? dashboard.contexts90
          : getContextSummaries(expenses, windowDays),
    cashflow: dashboard.cashflow,
    signals: dashboard.signals,
    recentExpenses: dashboard.recentExpenses,
    recentIncome: dashboard.recentIncome,
  };
}

export async function getSpendingTrends(granularity: "day" | "month" = "day") {
  const [expenses, incomes] = await Promise.all([getExpenseRecords(), Promise.resolve(listAllIncomeEntries())]);

  if (granularity === "day") {
    return getDailyTrend(expenses, incomes);
  }

  return getMonthlyTrend(expenses, incomes).flatMap((yearBlock) =>
    yearBlock.points.map((point) => ({
      year: yearBlock.year,
      ...point,
    })),
  );
}

export async function getContextBreakdown(windowDays: 30 | 90 = 30) {
  const expenses = await getExpenseRecords();
  return getContextSummaries(expenses, windowDays);
}

export async function getCashflowOutlook() {
  const [expenses, incomes] = await Promise.all([getExpenseRecords(), Promise.resolve(listAllIncomeEntries())]);
  return getCashflowSnapshot(expenses, incomes);
}

export async function getStructuredPurchaseAdvice(input: z.infer<typeof purchaseAdviceInputSchema>) {
  const payload = purchaseAdviceInputSchema.parse(input);
  const [expenses, incomes] = await Promise.all([getExpenseRecords(), Promise.resolve(listAllIncomeEntries())]);
  return buildPurchaseAdvice(expenses, incomes, payload);
}

export function addIncomeShift(input: z.infer<typeof incomeInputSchema>) {
  const payload = incomeInputSchema.parse(input);
  const entry = createIncomeEntry(payload);

  return {
    entry,
    recentIncome: listIncomeEntries(8),
  };
}

export function toToolText(name: string, payload: unknown) {
  return `${name}\n${JSON.stringify(payload, null, 2)}`;
}
