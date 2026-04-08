import { NextResponse } from "next/server";
import { z } from "zod";

import { buildPromptPurchaseAdvice, buildPurchaseAdvice } from "@/lib/analysis";
import { listAllIncomeEntries } from "@/lib/income-db";
import { getExpenseRecords } from "@/lib/notion";
import { parsePurchasePrompt, structuredRequestToParsedPrompt } from "@/lib/prompt-parser";
import { spendContexts } from "@/lib/types";

const purchaseAdviceSchema = z.object({
  prompt: z.string().trim().min(1, "Please describe what you want to buy.").optional(),
  itemName: z.string().trim().min(1).optional(),
  amount: z.number().positive().optional(),
  desiredContext: z.enum(spendContexts).optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  note: z.string().optional(),
});

const structuredPurchaseAdviceSchema = z.object({
  itemName: z.string().min(1),
  amount: z.number().positive(),
  desiredContext: z.enum(spendContexts),
  urgency: z.enum(["low", "medium", "high"]),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = purchaseAdviceSchema.parse(await request.json());
    const [expenses, incomes] = await Promise.all([getExpenseRecords(), Promise.resolve(listAllIncomeEntries())]);

    if (payload.prompt) {
      const parsedPrompt = parsePurchasePrompt(payload.prompt);
      const result = buildPromptPurchaseAdvice(expenses, incomes, parsedPrompt, payload.note);

      return NextResponse.json({
        ...result,
        parsedPrompt,
      });
    }

    const structuredPayload = structuredPurchaseAdviceSchema.parse(payload);
    const result = buildPurchaseAdvice(expenses, incomes, structuredPayload);

    return NextResponse.json({
      ...result,
      parsedPrompt: structuredRequestToParsedPrompt(structuredPayload),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to build purchase advice." }, { status: 500 });
  }
}
