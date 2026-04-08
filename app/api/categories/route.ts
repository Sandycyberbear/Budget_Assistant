import { NextResponse } from "next/server";

import { getContextSummaries } from "@/lib/analysis";
import { getExpenseRecords } from "@/lib/notion";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const windowParam = Number(searchParams.get("window") ?? "30");
  const windowDays = [30, 90].includes(windowParam) ? windowParam : 30;
  const expenses = await getExpenseRecords();

  return NextResponse.json(getContextSummaries(expenses, windowDays));
}
