import { describe, expect, it } from "vitest";

import { inferSpendContext } from "@/lib/spend-context";

describe("inferSpendContext", () => {
  it("maps holiday records directly to Holiday", () => {
    expect(
      inferSpendContext({
        name: "UCPA transfer",
        comment: "first part",
        categories: ["holiday"],
      }),
    ).toBe("Holiday");
  });

  it("treats regular food as Essentials when it does not look social", () => {
    expect(
      inferSpendContext({
        name: "Supermarket",
        comment: "weekly groceries",
        categories: ["Food"],
      }),
    ).toBe("Essentials");
  });

  it("treats dinner-like food as Social", () => {
    expect(
      inferSpendContext({
        name: "Berbere",
        comment: "晚餐",
        categories: ["Food"],
      }),
    ).toBe("Social");
  });
});
