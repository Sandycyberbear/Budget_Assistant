import { NextResponse } from "next/server";

import { isApiBearerAuthConfigured } from "@/lib/api-auth";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "budget-assistant",
    authConfigured: isApiBearerAuthConfigured(),
  });
}
