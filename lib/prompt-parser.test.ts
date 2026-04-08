import { describe, expect, it } from "vitest";

import { parsePurchasePrompt } from "@/lib/prompt-parser";

describe("parsePurchasePrompt", () => {
  it("extracts amount, item, context, and urgency from a Chinese prompt", () => {
    const parsed = parsePurchasePrompt("我想买 30 欧的粉底液，日常用品，中优先级，现在可以买么？");

    expect(parsed.amount).toBe(30);
    expect(parsed.itemName).toBe("粉底液");
    expect(parsed.desiredContext).toBe("Essentials");
    expect(parsed.urgency).toBe("medium");
    expect(parsed.isContextInferred).toBe(false);
    expect(parsed.isUrgencyDefaulted).toBe(false);
  });

  it("strips filler phrases out of the item name", () => {
    const parsed = parsePurchasePrompt("我能买80欧的护肤品吗？");

    expect(parsed.itemName).toBe("护肤品");
    expect(parsed.amount).toBe(80);
  });

  it("handles prompts with only item and amount", () => {
    const parsed = parsePurchasePrompt("买 45 欧的书");

    expect(parsed.itemName).toBe("书");
    expect(parsed.amount).toBe(45);
    expect(parsed.desiredContext).toBe("Growth");
    expect(parsed.isContextInferred).toBe(true);
  });

  it("detects explicit priority words", () => {
    const parsed = parsePurchasePrompt("我想买 20 欧的药，急用");

    expect(parsed.urgency).toBe("high");
    expect(parsed.desiredContext).toBe("Health");
  });

  it("keeps missing amount prompts readable instead of returning garbage", () => {
    const parsed = parsePurchasePrompt("我想买粉底液，现在可以买么？");

    expect(parsed.amount).toBeUndefined();
    expect(parsed.itemName).toBe("粉底液");
    expect(parsed.missingFields).toContain("amount");
    expect(parsed.itemName).not.toContain("可以买");
  });
});
