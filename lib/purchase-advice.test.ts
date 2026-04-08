import { describe, expect, it } from "vitest";

import { buildPurchaseAdvice } from "@/lib/analysis";
import type { ExpenseRecord, IncomeEntry } from "@/lib/types";

const expenses: ExpenseRecord[] = [
  {
    id: "1",
    name: "Supermarket",
    amount: 32,
    originalAmount: 32,
    date: "2026-04-01",
    categories: ["Food"],
    comment: "weekly groceries",
    paymentMethod: "N26",
    refunded: false,
    context: "Essentials",
  },
  {
    id: "2",
    name: "Notino",
    amount: 59.8,
    originalAmount: 59.8,
    date: "2026-04-02",
    categories: ["Self-care"],
    comment: "body lotion",
    paymentMethod: "Paypal",
    refunded: false,
    context: "Lifestyle",
  },
  {
    id: "3",
    name: "Dinner out",
    amount: 44,
    originalAmount: 44,
    date: "2026-04-03",
    categories: ["Food"],
    comment: "friends",
    paymentMethod: "N26",
    refunded: false,
    context: "Social",
  },
];

const incomes: IncomeEntry[] = [
  {
    id: 1,
    sourceType: "bar",
    shiftStart: "2026-04-08T18:00:00.000Z",
    shiftEnd: "2026-04-08T23:00:00.000Z",
    expectedAmount: 180,
    actualAmount: 180,
    status: "confirmed",
    reliability: "high",
    payoutDate: "2026-04-10",
    note: "",
    createdAt: "2026-04-08T10:00:00.000Z",
  },
];

describe("buildPurchaseAdvice", () => {
  it("keeps essentials from being over-blocked when support exists", () => {
    const result = buildPurchaseAdvice(
      expenses,
      incomes,
      {
        itemName: "Groceries",
        amount: 18,
        desiredContext: "Essentials",
        urgency: "high",
      },
      new Date("2026-04-08T10:00:00.000Z"),
    );

    expect(result.verdict).not.toBe("暂缓买");
  });

  it("becomes more conservative for hot lifestyle spending", () => {
    const result = buildPurchaseAdvice(
      [
        ...expenses,
        {
          id: "4",
          name: "Cosmetics",
          amount: 80,
          originalAmount: 80,
          date: "2026-04-06",
          categories: ["Self-care"],
          comment: "serum",
          paymentMethod: "Paypal",
          refunded: false,
          context: "Lifestyle",
        },
      ],
      [],
      {
        itemName: "More skincare",
        amount: 80,
        desiredContext: "Lifestyle",
        urgency: "low",
      },
      new Date("2026-04-08T10:00:00.000Z"),
    );

    expect(["谨慎买", "暂缓买"]).toContain(result.verdict);
  });
});
