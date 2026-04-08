import { NextResponse } from "next/server";

import { withApiBearerAuth } from "@/lib/api-auth";
import { contextWindowSchema, getContextBreakdown } from "@/lib/toolkit";

export const GET = withApiBearerAuth(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = contextWindowSchema.safeParse(Number(searchParams.get("windowDays") ?? "30"));
  const windowDays = parsed.success ? parsed.data : 30;

  return NextResponse.json(await getContextBreakdown(windowDays));
});
