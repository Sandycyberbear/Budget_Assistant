import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/openapi/route";

describe("GET /api/openapi", () => {
  it("publishes bearer auth for the tool endpoints", async () => {
    const response = await GET(new Request("https://budget.example.com/api/openapi"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.servers).toEqual([{ url: "https://budget.example.com" }]);
    expect(payload.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(payload.paths["/api/tools/budget-snapshot"].get.security).toEqual([{ bearerAuth: [] }]);
    expect(payload.paths["/api/tools/income-shifts"].post.responses["401"]).toBeDefined();
  });
});
