import { NextResponse } from "next/server";

import { withApiBearerAuth } from "@/lib/api-auth";
import { getBudgetSnapshot, summaryWindowSchema } from "@/lib/toolkit";

export const GET = withApiBearerAuth(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = summaryWindowSchema.safeParse(Number(searchParams.get("windowDays") ?? "30"));
  const windowDays = parsed.success ? parsed.data : 30;

  return NextResponse.json(await getBudgetSnapshot(windowDays));
});
