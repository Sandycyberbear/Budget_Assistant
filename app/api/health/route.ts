import { NextResponse } from "next/server";

import { isApiBearerAuthConfigured } from "@/lib/api-auth";
import { isNotionConfigured } from "@/lib/notion";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "budget-assistant",
    authConfigured: isApiBearerAuthConfigured(),
    notionConfigured: isNotionConfigured(),
  });
}
