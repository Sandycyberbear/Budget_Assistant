import { NextResponse } from "next/server";

import { withApiBearerAuth } from "@/lib/api-auth";
import { getSpendingTrends, trendGranularitySchema } from "@/lib/toolkit";

export const GET = withApiBearerAuth(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = trendGranularitySchema.safeParse(searchParams.get("granularity") ?? "day");
  const granularity = parsed.success ? parsed.data : "day";

  return NextResponse.json(await getSpendingTrends(granularity));
});
