import { NextResponse } from "next/server";

import { getSummaryMetrics } from "@/lib/analysis";
import { getExpenseRecords } from "@/lib/notion";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const windowParam = Number(searchParams.get("window") ?? "30");
  const windowDays = [30, 90, 180].includes(windowParam) ? windowParam : 30;
  const expenses = await getExpenseRecords();

  return NextResponse.json(getSummaryMetrics(expenses, windowDays));
}
