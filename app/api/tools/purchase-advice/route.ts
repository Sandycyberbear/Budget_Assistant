import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiBearerAuth } from "@/lib/api-auth";
import { getStructuredPurchaseAdvice, purchaseAdviceInputSchema } from "@/lib/toolkit";

export const POST = withApiBearerAuth(async function POST(request: Request) {
  try {
    const payload = purchaseAdviceInputSchema.parse(await request.json());
    return NextResponse.json(await getStructuredPurchaseAdvice(payload));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to build purchase advice." }, { status: 500 });
  }
});
