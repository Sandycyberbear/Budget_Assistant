import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExpenseRecord, IncomeEntry } from "@/lib/types";

vi.mock("@/lib/notion", () => ({
  getExpenseRecords: vi.fn(),
}));

vi.mock("@/lib/income-db", () => ({
  listAllIncomeEntries: vi.fn(),
}));

import { POST } from "@/app/api/purchase-advice/route";
import { listAllIncomeEntries } from "@/lib/income-db";
import { getExpenseRecords } from "@/lib/notion";

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

beforeEach(() => {
  vi.mocked(getExpenseRecords).mockResolvedValue(expenses);
  vi.mocked(listAllIncomeEntries).mockReturnValue(incomes);
});

describe("POST /api/purchase-advice", () => {
  it("supports prompt-first requests and returns parsed metadata", async () => {
    const response = await POST(
      new Request("http://localhost/api/purchase-advice", {
        method: "POST",
        body: JSON.stringify({
          prompt: "我想买 30 欧的粉底液，中优先级，现在可以买么？",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.parsedPrompt.itemName).toBe("粉底液");
    expect(payload.parsedPrompt.amount).toBe(30);
    expect(payload.analysisMode).toBe("full");
  });

  it("returns a graceful response when the amount is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/purchase-advice", {
        method: "POST",
        body: JSON.stringify({
          prompt: "我想买粉底液，现在可以买么？",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.verdict).toBe("还缺价格");
    expect(payload.analysisMode).toBe("needs_amount");
    expect(payload.riskFlags[0]).toContain("No price");
  });

  it("keeps the old structured payload working", async () => {
    const response = await POST(
      new Request("http://localhost/api/purchase-advice", {
        method: "POST",
        body: JSON.stringify({
          itemName: "Groceries",
          amount: 18,
          desiredContext: "Essentials",
          urgency: "high",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.parsedPrompt.itemName).toBe("Groceries");
    expect(payload.parsedPrompt.amount).toBe(18);
    expect(payload.analysisMode).toBe("full");
  });

  it("returns a friendly validation error for an empty prompt", async () => {
    const response = await POST(
      new Request("http://localhost/api/purchase-advice", {
        method: "POST",
        body: JSON.stringify({
          prompt: "",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Please describe what you want to buy.");
  });
});
