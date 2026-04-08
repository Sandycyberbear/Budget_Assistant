export const spendContexts = [
  "Essentials",
  "Lifestyle",
  "Holiday",
  "Social",
  "Growth",
  "Health",
  "Work & Admin",
] as const;

export type SpendContext = (typeof spendContexts)[number];

export type ExpenseRecord = {
  id: string;
  name: string;
  amount: number;
  originalAmount: number;
  date: string;
  categories: string[];
  comment: string;
  paymentMethod: string | null;
  refunded: boolean;
  context: SpendContext;
};

export const incomeSourceTypes = [
  "milk_tea_shop",
  "bar",
  "part_time",
  "online_shop",
  "other",
] as const;

export type IncomeSourceType = (typeof incomeSourceTypes)[number];

export const incomeStatuses = [
  "planned",
  "confirmed",
  "received",
  "cancelled",
] as const;

export type IncomeStatus = (typeof incomeStatuses)[number];

export const incomeReliabilities = ["high", "medium", "low"] as const;

export type IncomeReliability = (typeof incomeReliabilities)[number];

export type IncomeEntry = {
  id: number;
  sourceType: IncomeSourceType;
  shiftStart: string;
  shiftEnd: string;
  expectedAmount: number;
  actualAmount: number | null;
  status: IncomeStatus;
  reliability: IncomeReliability;
  payoutDate: string;
  note: string;
  createdAt: string;
};

export type SummaryMetrics = {
  windowDays: number;
  totalSpend: number;
  averageDailySpend: number;
  projectedMonthSpend: number;
  refundOffset: number;
  transactionCount: number;
};

export type TrendPoint = {
  label: string;
  spend: number;
  inflow: number;
  net: number;
};

export type MonthlyTrendYear = {
  year: number;
  points: TrendPoint[];
};

export type ContextSummary = {
  context: SpendContext;
  spend: number;
  transactionCount: number;
  changeRatio: number;
};

export type BehaviorSignal = {
  title: string;
  detail: string;
  severity: "alert" | "watch" | "positive";
};

export type SourcePerformance = {
  sourceType: IncomeSourceType;
  shifts: number;
  totalActual: number;
  totalExpected: number;
  averageActual: number;
  averageExpected: number;
  averageHours: number;
  reliabilityScore: number;
};

export type CashflowSnapshot = {
  monthSpend: number;
  projectedMonthSpend: number;
  confirmedInflow: number;
  weightedPlannedInflow: number;
  next14DaySupport: number;
  next14DayProjectedSpend: number;
  sourcePerformance: SourcePerformance[];
  upcomingIncome: IncomeEntry[];
};

export type PurchaseUrgency = "low" | "medium" | "high";

export type PurchaseAdviceRequest = {
  itemName: string;
  amount: number;
  desiredContext: SpendContext;
  urgency: PurchaseUrgency;
  note?: string;
};

export type ParsedPurchasePrompt = {
  rawPrompt: string;
  itemName?: string;
  amount?: number;
  desiredContext: SpendContext;
  urgency: PurchaseUrgency;
  isAmountInferred: boolean;
  isContextInferred: boolean;
  isUrgencyDefaulted: boolean;
  isItemNameInferred: boolean;
  missingFields: Array<"itemName" | "amount">;
  unparsedRemainder?: string;
};

export type PurchaseAdviceAnalysisMode = "full" | "needs_amount";

export type PurchaseAdviceResult = {
  verdict: "可以买" | "谨慎买" | "暂缓买" | "还缺价格";
  desiredContext: SpendContext;
  summary: string;
  reasons: string[];
  riskFlags: string[];
  suggestedActions: string[];
  affordabilityScore: number;
  analysisMode: PurchaseAdviceAnalysisMode;
};

export type PurchaseAdviceResponse = PurchaseAdviceResult & {
  parsedPrompt: ParsedPurchasePrompt;
};

export type DashboardData = {
  summary30: SummaryMetrics;
  summary90: SummaryMetrics;
  dailyTrends: TrendPoint[];
  monthlyTrends: MonthlyTrendYear[];
  contexts30: ContextSummary[];
  contexts90: ContextSummary[];
  signals: BehaviorSignal[];
  cashflow: CashflowSnapshot;
  recentExpenses: ExpenseRecord[];
  recentIncome: IncomeEntry[];
  isNotionConfigured: boolean;
  notionMessage: string;
};
