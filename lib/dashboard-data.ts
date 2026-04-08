import {
  getBehaviorSignals,
  getCashflowSnapshot,
  getContextSummaries,
  getDailyTrend,
  getMonthlyTrend,
  getSummaryMetrics,
} from "@/lib/analysis";
import { listAllIncomeEntries, listIncomeEntries } from "@/lib/income-db";
import { getExpenseRecords, getNotionStatus } from "@/lib/notion";
import type { DashboardData } from "@/lib/types";

export async function getDashboardData(): Promise<DashboardData> {
  const [expenses, notionStatus] = await Promise.all([getExpenseRecords(), Promise.resolve(getNotionStatus())]);
  const incomes = listAllIncomeEntries();

  return {
    summary30: getSummaryMetrics(expenses, 30),
    summary90: getSummaryMetrics(expenses, 90),
    dailyTrends: getDailyTrend(expenses, incomes),
    monthlyTrends: getMonthlyTrend(expenses, incomes),
    contexts30: getContextSummaries(expenses, 30),
    contexts90: getContextSummaries(expenses, 90),
    signals: getBehaviorSignals(expenses),
    cashflow: getCashflowSnapshot(expenses, incomes),
    recentExpenses: expenses.slice(-8).reverse(),
    recentIncome: listIncomeEntries(8),
    isNotionConfigured: notionStatus.configured,
    notionMessage: notionStatus.message,
  };
}
