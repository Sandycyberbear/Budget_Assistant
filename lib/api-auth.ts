import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

type AppRouteHandler = (request: Request) => Response | Promise<Response>;

function getConfiguredToken() {
  const token = (
    process.env.API_BEARER_TOKEN ??
    process.env.BUDGET_ASSISTANT_API_BEARER_TOKEN ??
    process.env.BEARER_TOKEN
  )?.trim();
  return token ? token : null;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, ...rest] = authorization.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== "bearer" || rest.length === 0) {
    return null;
  }

  return rest.join(" ");
}

function tokensMatch(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftHash, rightHash);
}

export function withApiBearerAuth(handler: AppRouteHandler): AppRouteHandler {
  return async function authenticatedHandler(request: Request) {
    const configuredToken = getConfiguredToken();

    if (!configuredToken) {
      return NextResponse.json(
        { error: "API bearer auth is not configured." },
        { status: 500 },
      );
    }

    const providedToken = getBearerToken(request);
    if (!providedToken || !tokensMatch(providedToken, configuredToken)) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="budget-assistant"' } },
      );
    }

    return handler(request);
  };
}

export function isApiBearerAuthConfigured() {
  return Boolean(getConfiguredToken());
}
