import { describe, expect, it } from "vitest";

import { getSummaryMetrics } from "@/lib/analysis";
import type { ExpenseRecord } from "@/lib/types";

function expense(
  id: string,
  date: string,
  amount: number,
  context: ExpenseRecord["context"],
): ExpenseRecord {
  return {
    id,
    name: `${context}-${id}`,
    amount,
    originalAmount: amount,
    date,
    categories: [],
    comment: "",
    paymentMethod: "N26",
    refunded: false,
    context,
  };
}

describe("getSummaryMetrics projectedMonthSpend", () => {
  it("smooths an early spike with historical context-aware history", () => {
    const records: ExpenseRecord[] = [
      expense("jan-1", "2026-01-04", 120, "Essentials"),
      expense("jan-2", "2026-01-20", 180, "Essentials"),
      expense("feb-1", "2026-02-05", 100, "Essentials"),
      expense("feb-2", "2026-02-16", 200, "Essentials"),
      expense("mar-1", "2026-03-03", 90, "Essentials"),
      expense("mar-2", "2026-03-21", 210, "Essentials"),
      expense("apr-1", "2026-04-03", 180, "Essentials"),
    ];

    const metrics = getSummaryMetrics(records, 30, new Date("2026-04-08T12:00:00.000Z"));
    const naiveLinearProjection = (180 / 8) * 30;

    expect(metrics.projectedMonthSpend).toBeGreaterThanOrEqual(180);
    expect(metrics.projectedMonthSpend).toBeLessThan(naiveLinearProjection);
    expect(metrics.projectedMonthSpend).toBeLessThan(420);
  });

  it("falls back to a reduced linear projection when there is no history", () => {
    const records: ExpenseRecord[] = [
      expense("apr-1", "2026-04-02", 100, "Holiday"),
      expense("apr-2", "2026-04-04", 50, "Holiday"),
    ];

    const metrics = getSummaryMetrics(records, 30, new Date("2026-04-08T12:00:00.000Z"));
    const naiveLinearProjection = (150 / 8) * 30;

    expect(metrics.projectedMonthSpend).toBeGreaterThan(150);
    expect(metrics.projectedMonthSpend).toBeLessThan(naiveLinearProjection);
  });
});
