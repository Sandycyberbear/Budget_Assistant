import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/toolkit", () => ({
  getBudgetSnapshot: vi.fn(),
  summaryWindowSchema: {
    safeParse(value: number) {
      return value === 30 || value === 90 || value === 180
        ? { success: true as const, data: value }
        : { success: false as const };
    },
  },
}));

import { GET } from "@/app/api/tools/budget-snapshot/route";
import { getBudgetSnapshot } from "@/lib/toolkit";

describe("GET /api/tools/budget-snapshot", () => {
  const originalToken = process.env.API_BEARER_TOKEN;

  beforeEach(() => {
    process.env.API_BEARER_TOKEN = "test-token";
    vi.mocked(getBudgetSnapshot).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    process.env.API_BEARER_TOKEN = originalToken;
    vi.clearAllMocks();
  });

  it("returns 401 when the bearer token is missing", async () => {
    const response = await GET(new Request("http://localhost/api/tools/budget-snapshot"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized.");
    expect(getBudgetSnapshot).not.toHaveBeenCalled();
  });

  it("returns the payload when the bearer token is valid", async () => {
    const response = await GET(
      new Request("http://localhost/api/tools/budget-snapshot?windowDays=90", {
        headers: {
          Authorization: "Bearer test-token",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(getBudgetSnapshot).toHaveBeenCalledWith(90);
  });
});
