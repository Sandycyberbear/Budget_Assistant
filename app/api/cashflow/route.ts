import { NextResponse } from "next/server";

import { getCashflowSnapshot } from "@/lib/analysis";
import { listAllIncomeEntries } from "@/lib/income-db";
import { getExpenseRecords } from "@/lib/notion";

export async function GET() {
  const [expenses, incomes] = await Promise.all([getExpenseRecords(), Promise.resolve(listAllIncomeEntries())]);
  return NextResponse.json(getCashflowSnapshot(expenses, incomes));
}
