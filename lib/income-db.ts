import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";

import type {
  IncomeEntry,
  IncomeReliability,
  IncomeSourceType,
  IncomeStatus,
} from "@/lib/types";

const sourceTypeSchema = z.enum([
  "milk_tea_shop",
  "bar",
  "part_time",
  "online_shop",
  "other",
]);
const statusSchema = z.enum(["planned", "confirmed", "received", "cancelled"]);
const reliabilitySchema = z.enum(["high", "medium", "low"]);

export const incomeInputSchema = z.object({
  sourceType: sourceTypeSchema,
  shiftStart: z.string().min(1),
  shiftEnd: z.string().min(1),
  expectedAmount: z.number().nonnegative(),
  actualAmount: z.number().nonnegative().nullable().optional(),
  status: statusSchema,
  reliability: reliabilitySchema,
  payoutDate: z.string().min(1),
  note: z.string().max(240).optional(),
});

type IncomeInput = z.infer<typeof incomeInputSchema>;

declare global {
  var __budgetAssistantDb: Database.Database | undefined;
}

function getDbPath() {
  if (process.env.DATABASE_PATH) {
    return resolve(process.env.DATABASE_PATH);
  }

  return resolve(process.cwd(), "data", "budget-assistant.sqlite");
}

function getDb() {
  if (global.__budgetAssistantDb) {
    return global.__budgetAssistantDb;
  }

  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sourceType TEXT NOT NULL,
      shiftStart TEXT NOT NULL,
      shiftEnd TEXT NOT NULL,
      expectedAmount REAL NOT NULL,
      actualAmount REAL,
      status TEXT NOT NULL,
      reliability TEXT NOT NULL,
      payoutDate TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );
  `);
  global.__budgetAssistantDb = db;
  return db;
}

function mapRow(row: Record<string, unknown>): IncomeEntry {
  return {
    id: Number(row.id),
    sourceType: row.sourceType as IncomeSourceType,
    shiftStart: String(row.shiftStart),
    shiftEnd: String(row.shiftEnd),
    expectedAmount: Number(row.expectedAmount),
    actualAmount: row.actualAmount === null ? null : Number(row.actualAmount),
    status: row.status as IncomeStatus,
    reliability: row.reliability as IncomeReliability,
    payoutDate: String(row.payoutDate),
    note: String(row.note ?? ""),
    createdAt: String(row.createdAt),
  };
}

export function listIncomeEntries(limit = 12): IncomeEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT *
        FROM incomes
        ORDER BY payoutDate DESC, id DESC
        LIMIT ?
      `,
    )
    .all(limit) as Record<string, unknown>[];

  return rows.map(mapRow);
}

export function listAllIncomeEntries(): IncomeEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT *
        FROM incomes
        ORDER BY payoutDate ASC, id ASC
      `,
    )
    .all() as Record<string, unknown>[];

  return rows.map(mapRow);
}

export function createIncomeEntry(input: IncomeInput): IncomeEntry {
  const parsed = incomeInputSchema.parse(input);
  const db = getDb();
  const createdAt = new Date().toISOString();

  const result = db
    .prepare(
      `
        INSERT INTO incomes (
          sourceType,
          shiftStart,
          shiftEnd,
          expectedAmount,
          actualAmount,
          status,
          reliability,
          payoutDate,
          note,
          createdAt
        )
        VALUES (
          @sourceType,
          @shiftStart,
          @shiftEnd,
          @expectedAmount,
          @actualAmount,
          @status,
          @reliability,
          @payoutDate,
          @note,
          @createdAt
        )
      `,
    )
    .run({
      ...parsed,
      actualAmount: parsed.actualAmount ?? null,
      note: parsed.note ?? "",
      createdAt,
    });

  return mapRow({
    id: result.lastInsertRowid,
    ...parsed,
    actualAmount: parsed.actualAmount ?? null,
    note: parsed.note ?? "",
    createdAt,
  });
}
