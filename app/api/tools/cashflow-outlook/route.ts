import { NextResponse } from "next/server";

import { withApiBearerAuth } from "@/lib/api-auth";
import { getCashflowOutlook } from "@/lib/toolkit";

export const GET = withApiBearerAuth(async function GET() {
  return NextResponse.json(await getCashflowOutlook());
});
