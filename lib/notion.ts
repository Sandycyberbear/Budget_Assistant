import { unstable_cache } from "next/cache";
import { z } from "zod";

import { addContexts } from "@/lib/spend-context";
import type { ExpenseRecord } from "@/lib/types";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const DEFAULT_DATA_SOURCE_ID = "d8fc924d-b1e4-4ae4-bd66-0132c5997028";
const NOTION_VERSION = "2025-09-03";

type RawNotionPage = {
  id: string;
  properties?: Record<string, unknown>;
};

const notionQueryResponseSchema = z.object({
  results: z.array(z.custom<RawNotionPage>()),
  has_more: z.boolean(),
  next_cursor: z.string().nullable().optional(),
});

function getNotionConfig() {
  const token = (
    process.env.NOTION_API_TOKEN ??
    process.env.BUDGET_ASSISTANT_NOTION_API_TOKEN
  )?.trim();
  const dataSourceId = (
    process.env.NOTION_EXPENSES_DATA_SOURCE_ID ??
    process.env.BUDGET_ASSISTANT_NOTION_EXPENSES_DATA_SOURCE_ID ??
    DEFAULT_DATA_SOURCE_ID
  )?.trim();

  return {
    token,
    dataSourceId,
    configured: Boolean(token),
  };
}

function extractPlainText(property: unknown): string {
  if (!property || typeof property !== "object") {
    return "";
  }

  const typed = property as {
    type?: string;
    title?: Array<{ plain_text?: string }>;
    rich_text?: Array<{ plain_text?: string }>;
  };

  if (typed.type === "title") {
    return typed.title?.map((part) => part.plain_text ?? "").join("") ?? "";
  }

  if (typed.type === "rich_text") {
    return typed.rich_text?.map((part) => part.plain_text ?? "").join("") ?? "";
  }

  return "";
}

function extractNumber(property: unknown): number | null {
  if (!property || typeof property !== "object") {
    return null;
  }

  const typed = property as { type?: string; number?: number | null };
  return typed.type === "number" ? typed.number ?? null : null;
}

function extractMultiSelect(property: unknown): string[] {
  if (!property || typeof property !== "object") {
    return [];
  }

  const typed = property as {
    type?: string;
    multi_select?: Array<{ name?: string }>;
  };

  return typed.type === "multi_select"
    ? (typed.multi_select ?? []).map((option) => option.name ?? "").filter(Boolean)
    : [];
}

function extractSelect(property: unknown): string | null {
  if (!property || typeof property !== "object") {
    return null;
  }

  const typed = property as {
    type?: string;
    select?: { name?: string } | null;
  };

  return typed.type === "select" ? typed.select?.name ?? null : null;
}

function extractDate(property: unknown): string | null {
  if (!property || typeof property !== "object") {
    return null;
  }

  const typed = property as {
    type?: string;
    date?: { start?: string | null } | null;
  };

  return typed.type === "date" ? typed.date?.start ?? null : null;
}

function extractCheckbox(property: unknown): boolean {
  if (!property || typeof property !== "object") {
    return false;
  }

  const typed = property as { type?: string; checkbox?: boolean };
  return typed.type === "checkbox" ? Boolean(typed.checkbox) : false;
}

async function fetchExpensePages(): Promise<RawNotionPage[]> {
  const config = getNotionConfig();
  if (!config.token) {
    return [];
  }

  const results: RawNotionPage[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await fetch(`${NOTION_API_BASE_URL}/data_sources/${config.dataSourceId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
      next: {
        revalidate: 900,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Notion query failed (${response.status}): ${text}`);
    }

    const payload = notionQueryResponseSchema.parse(await response.json());
    results.push(...payload.results);

    if (!payload.has_more || !payload.next_cursor) {
      break;
    }

    cursor = payload.next_cursor;
  }

  return results;
}

function normalizeExpensePage(page: RawNotionPage): Omit<ExpenseRecord, "context"> | null {
  const properties = page.properties ?? {};
  const amount = extractNumber(properties.Amount);
  const date = extractDate(properties.Date);
  const name = extractPlainText(properties.Expense).trim();

  if (amount === null || !date || !name) {
    return null;
  }

  const refunded = extractCheckbox(properties["退货"]);
  const normalizedAmount = refunded ? -Math.abs(amount) : amount;

  return {
    id: page.id,
    name,
    originalAmount: amount,
    amount: normalizedAmount,
    date: date.slice(0, 10),
    categories: extractMultiSelect(properties.Category),
    comment: extractPlainText(properties.Comment).trim(),
    paymentMethod: extractSelect(properties["支付方式"]),
    refunded,
  };
}

async function getExpenseRecordsUncached(): Promise<ExpenseRecord[]> {
  const pages = await fetchExpensePages();

  return addContexts(
    pages
      .map(normalizeExpensePage)
      .filter((record): record is NonNullable<typeof record> => record !== null)
      .sort((left, right) => left.date.localeCompare(right.date)),
  );
}

const getCachedExpenseRecords = unstable_cache(getExpenseRecordsUncached, ["expense-records"], {
  revalidate: 900,
});

export async function getExpenseRecords(): Promise<ExpenseRecord[]> {
  const config = getNotionConfig();
  if (!config.configured) {
    return [];
  }

  return getCachedExpenseRecords();
}

export function getNotionStatus() {
  const config = getNotionConfig();
  if (!config.configured) {
    return {
      configured: false,
      message: "Add NOTION_API_TOKEN to start syncing your Simple Budget expenses.",
      dataSourceId: config.dataSourceId,
    };
  }

  return {
    configured: true,
    message: "Expenses are synced from your Notion Simple Budget data source.",
    dataSourceId: config.dataSourceId,
  };
}

export function isNotionConfigured() {
  return getNotionStatus().configured;
}
