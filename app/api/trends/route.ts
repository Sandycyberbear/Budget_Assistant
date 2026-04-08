import { NextResponse } from "next/server";

import { getDailyTrend, getMonthlyTrend } from "@/lib/analysis";
import { listAllIncomeEntries } from "@/lib/income-db";
import { getExpenseRecords } from "@/lib/notion";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get("granularity") ?? "day";
  const expenses = await getExpenseRecords();
  const incomes = listAllIncomeEntries();

  return NextResponse.json(
    granularity === "month"
      ? getMonthlyTrend(expenses, incomes)
      : getDailyTrend(expenses, incomes),
  );
}
