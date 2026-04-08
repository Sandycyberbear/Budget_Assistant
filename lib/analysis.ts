import {
  addDays,
  differenceInCalendarDays,
  differenceInHours,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

import { spendContexts } from "@/lib/types";
import type {
  BehaviorSignal,
  CashflowSnapshot,
  ContextSummary,
  ExpenseRecord,
  IncomeEntry,
  MonthlyTrendYear,
  ParsedPurchasePrompt,
  PurchaseAdviceRequest,
  PurchaseAdviceResult,
  SourcePerformance,
  SummaryMetrics,
  TrendPoint,
} from "@/lib/types";

function sortExpenses(records: ExpenseRecord[]) {
  return [...records].sort((left, right) => left.date.localeCompare(right.date));
}

function getWindow(records: ExpenseRecord[], days: number, now = new Date()) {
  const start = startOfDay(subDays(now, days - 1));
  return records.filter((record) => parseISO(record.date) >= start);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function groupBy<T, K extends string>(items: T[], getKey: (item: T) => K) {
  return items.reduce<Record<K, T[]>>((groups, item) => {
    const key = getKey(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[index] ?? 0;
}

function getProjectionProfile(context: ExpenseRecord["context"]) {
  if (context === "Holiday" || context === "Growth") {
    return {
      noHistoryFactor: 0.45,
      minRatio: 0.55,
      maxRatio: 1,
    };
  }

  if (context === "Lifestyle" || context === "Social") {
    return {
      noHistoryFactor: 0.75,
      minRatio: 0.7,
      maxRatio: 1.2,
    };
  }

  return {
    noHistoryFactor: 1,
    minRatio: 0.8,
    maxRatio: 1.35,
  };
}

function getProjectedMonthSpend(records: ExpenseRecord[], now = new Date()) {
  const monthStart = startOfMonth(now);
  const elapsedDays = Math.max(differenceInCalendarDays(now, monthStart) + 1, 1);
  const daysInMonth = differenceInCalendarDays(endOfMonth(now), monthStart) + 1;
  const remainingDays = Math.max(daysInMonth - elapsedDays, 0);
  const currentMonthRecords = records.filter((record) => isSameMonth(parseISO(record.date), monthStart));
  const currentMonthSpend = sum(currentMonthRecords.map((record) => record.amount));

  if (remainingDays === 0) {
    return currentMonthSpend;
  }

  const contextProjection = spendContexts.reduce((total, context) => {
    const currentContextSpend = sum(
      currentMonthRecords
        .filter((record) => record.context === context)
        .map((record) => record.amount),
    );

    const historicalSnapshots = Array.from({ length: 6 }, (_, index) => {
      const historicalMonth = subMonths(monthStart, index + 1);
      const historicalMonthStart = startOfMonth(historicalMonth);
      const historicalDays = differenceInCalendarDays(endOfMonth(historicalMonthStart), historicalMonthStart) + 1;
      const sameDayCutoff = Math.min(elapsedDays, historicalDays);
      const recordsInMonth = records.filter((record) => {
        const date = parseISO(record.date);
        return isSameMonth(date, historicalMonthStart) && record.context === context;
      });

      const sameDaySpend = sum(
        recordsInMonth
          .filter((record) => {
            const dayOfMonth = parseISO(record.date).getDate();
            return dayOfMonth <= sameDayCutoff;
          })
          .map((record) => record.amount),
      );
      const totalSpend = sum(recordsInMonth.map((record) => record.amount));

      return {
        sameDaySpend,
        totalSpend,
        remainingSpend: totalSpend - sameDaySpend,
      };
    });

    const historyWithActivity = historicalSnapshots.filter(
      (snapshot) => snapshot.sameDaySpend > 0 || snapshot.totalSpend > 0,
    );

    const { noHistoryFactor, minRatio, maxRatio } = getProjectionProfile(context);
    if (historyWithActivity.length === 0) {
      const linearRemainder = elapsedDays === 0 ? 0 : (currentContextSpend / elapsedDays) * remainingDays;
      return total + currentContextSpend + linearRemainder * noHistoryFactor;
    }

    const sameDayMedian = percentile(
      historyWithActivity.map((snapshot) => snapshot.sameDaySpend),
      0.5,
    );
    const remainingMedian = percentile(
      historyWithActivity.map((snapshot) => snapshot.remainingSpend),
      0.5,
    );
    const paceRatio =
      sameDayMedian <= 0 ? 1 : Math.min(Math.max(currentContextSpend / sameDayMedian, minRatio), maxRatio);

    return total + Math.max(currentContextSpend, currentContextSpend + remainingMedian * paceRatio);
  }, 0);

  const linearProjection = elapsedDays === 0 ? 0 : (currentMonthSpend / elapsedDays) * daysInMonth;
  const historicalMonthTotals = Array.from({ length: 6 }, (_, index) => {
    const historicalMonth = subMonths(monthStart, index + 1);
    return sum(
      records
        .filter((record) => isSameMonth(parseISO(record.date), historicalMonth))
        .map((record) => record.amount),
    );
  }).filter((total) => total > 0);
  const historicalMedian = historicalMonthTotals.length
    ? percentile(historicalMonthTotals, 0.5)
    : linearProjection;

  return contextProjection * 0.6 + Math.min(linearProjection, historicalMedian * 1.2) * 0.4;
}

function getReliabilityWeight(reliability: IncomeEntry["reliability"]) {
  switch (reliability) {
    case "high":
      return 0.8;
    case "medium":
      return 0.5;
    case "low":
      return 0.2;
    default:
      return 0;
  }
}

function getIncomeContribution(entry: IncomeEntry) {
  if (entry.status === "received") {
    return entry.actualAmount ?? entry.expectedAmount;
  }

  if (entry.status === "confirmed") {
    return entry.actualAmount ?? entry.expectedAmount;
  }

  if (entry.status === "planned") {
    return entry.expectedAmount * getReliabilityWeight(entry.reliability);
  }

  return 0;
}

export function getSummaryMetrics(records: ExpenseRecord[], windowDays: number, now = new Date()): SummaryMetrics {
  const inWindow = getWindow(records, windowDays, now);
  const totalSpend = sum(inWindow.map((record) => record.amount));
  const transactionCount = inWindow.length;
  const refundOffset = Math.abs(
    sum(inWindow.filter((record) => record.refunded).map((record) => record.amount)),
  );

  const monthStart = startOfMonth(now);
  const elapsedDays = Math.max(differenceInCalendarDays(now, monthStart) + 1, 1);
  return {
    windowDays,
    totalSpend,
    averageDailySpend: transactionCount === 0 ? 0 : totalSpend / windowDays,
    projectedMonthSpend: elapsedDays === 0 ? 0 : getProjectedMonthSpend(records, now),
    refundOffset,
    transactionCount,
  };
}

export function getDailyTrend(records: ExpenseRecord[], incomes: IncomeEntry[], now = new Date()): TrendPoint[] {
  const start = startOfDay(subDays(now, 29));
  const daily: TrendPoint[] = [];

  for (let offset = 0; offset < 30; offset += 1) {
    const date = addDays(start, offset);
    const iso = format(date, "yyyy-MM-dd");
    const spend = sum(records.filter((record) => record.date === iso).map((record) => record.amount));
    const inflow = sum(
      incomes
        .filter((entry) => entry.payoutDate === iso && entry.status !== "cancelled")
        .map((entry) => getIncomeContribution(entry)),
    );

    daily.push({
      label: format(date, "MMM d"),
      spend,
      inflow,
      net: inflow - spend,
    });
  }

  return daily;
}

export function getMonthlyTrend(records: ExpenseRecord[], incomes: IncomeEntry[], now = new Date()): MonthlyTrendYear[] {
  const datedYears = [
    ...records.map((record) => parseISO(record.date).getFullYear()),
    ...incomes.map((entry) => parseISO(entry.payoutDate).getFullYear()),
    now.getFullYear(),
  ];
  const startYear = Math.min(...datedYears);
  const endYear = Math.max(...datedYears);
  const yearlyPoints: MonthlyTrendYear[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const points: TrendPoint[] = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const month = new Date(year, monthIndex, 1);
      const monthKey = format(month, "yyyy-MM");
      const spend = sum(
        records
          .filter((record) => record.date.startsWith(monthKey))
          .map((record) => record.amount),
      );
      const inflow = sum(
        incomes
          .filter((entry) => entry.payoutDate.startsWith(monthKey) && entry.status !== "cancelled")
          .map((entry) => getIncomeContribution(entry)),
      );

      points.push({
        label: format(month, "MMM"),
        spend,
        inflow,
        net: inflow - spend,
      });
    }

    yearlyPoints.push({
      year,
      points,
    });
  }

  return yearlyPoints;
}

export function getContextSummaries(records: ExpenseRecord[], windowDays: number, now = new Date()): ContextSummary[] {
  const current = getWindow(records, windowDays, now);
  const previousStart = startOfDay(subDays(now, windowDays * 2 - 1));
  const previousEnd = startOfDay(subDays(now, windowDays));
  const previous = records.filter((record) => {
    const date = parseISO(record.date);
    return !isBefore(date, previousStart) && isBefore(date, previousEnd);
  });

  return spendContexts
    .map((context) => {
      const currentRecords = current.filter((record) => record.context === context);
      const previousRecords = previous.filter((record) => record.context === context);
      const spend = sum(currentRecords.map((record) => record.amount));
      const previousSpend = sum(previousRecords.map((record) => record.amount));
      const changeRatio = previousSpend === 0 ? (spend > 0 ? 1 : 0) : (spend - previousSpend) / previousSpend;

      return {
        context,
        spend,
        transactionCount: currentRecords.length,
        changeRatio,
      };
    })
    .sort((left, right) => right.spend - left.spend);
}

export function getBehaviorSignals(records: ExpenseRecord[], now = new Date()): BehaviorSignal[] {
  const last90 = getWindow(records, 90, now);
  const last30 = getWindow(records, 30, now);
  const contextSummaries = getContextSummaries(records, 30, now);
  const signals: BehaviorSignal[] = [];

  const hottestContext = contextSummaries.find((summary) => summary.changeRatio > 0.25 && summary.spend > 0);
  if (hottestContext) {
    signals.push({
      title: `${hottestContext.context} is heating up`,
      detail: `This context is up ${Math.round(hottestContext.changeRatio * 100)}% versus the previous 30 days.`,
      severity: "alert",
    });
  }

  const threshold = percentile(last90.map((record) => Math.abs(record.amount)), 0.9);
  const recentLargeExpense = sortExpenses(last30)
    .reverse()
    .find((record) => Math.abs(record.amount) >= threshold && threshold > 0);

  if (recentLargeExpense) {
    signals.push({
      title: "Recent large expense landed",
      detail: `${recentLargeExpense.name} added ${recentLargeExpense.amount.toFixed(2)} EUR to your recent pattern.`,
      severity: "watch",
    });
  }

  const merchantGroups = Object.values(
    groupBy(last30, (record) => record.name.trim().toLowerCase() || record.id),
  ).filter((group) => group.length >= 2);

  if (merchantGroups[0]) {
    const merchant = merchantGroups[0];
    signals.push({
      title: "Repeat spending detected",
      detail: `${merchant[0]?.name ?? "A merchant"} showed up ${merchant.length} times in the last 30 days.`,
      severity: "watch",
    });
  }

  if (signals.length === 0) {
    signals.push({
      title: "Pattern looks steady",
      detail: "No unusual spikes stood out in the last 30 days.",
      severity: "positive",
    });
  }

  return signals.slice(0, 3);
}

export function getCashflowSnapshot(records: ExpenseRecord[], incomes: IncomeEntry[], now = new Date()): CashflowSnapshot {
  const monthStart = startOfMonth(now);
  const monthSpend = sum(
    records
      .filter((record) => isSameMonth(parseISO(record.date), monthStart))
      .map((record) => record.amount),
  );

  const projectedMonthSpend = getSummaryMetrics(records, 30, now).projectedMonthSpend;
  const next14Cutoff = addDays(startOfDay(now), 14);

  const next14DaySpend = sum(
    records
      .filter((record) => {
        const date = parseISO(record.date);
        return isAfter(date, subDays(startOfDay(now), 14)) && isBefore(date, startOfDay(now));
      })
      .map((record) => record.amount),
  );

  const upcomingIncome = incomes
    .filter((entry) => {
      const payout = parseISO(entry.payoutDate);
      return !isBefore(payout, startOfDay(now)) && !isAfter(payout, next14Cutoff) && entry.status !== "cancelled";
    })
    .sort((left, right) => left.payoutDate.localeCompare(right.payoutDate));

  const confirmedInflow = sum(
    upcomingIncome
      .filter((entry) => entry.status === "confirmed" || entry.status === "received")
      .map((entry) => entry.actualAmount ?? entry.expectedAmount),
  );

  const weightedPlannedInflow = sum(
    upcomingIncome
      .filter((entry) => entry.status === "planned")
      .map((entry) => entry.expectedAmount * getReliabilityWeight(entry.reliability)),
  );

  const sourcePerformance: SourcePerformance[] = Object.entries(
    groupBy(incomes.filter((entry) => entry.status !== "cancelled"), (entry) => entry.sourceType),
  )
    .map(([sourceType, entries]) => {
      const actuals = entries.map((entry) => entry.actualAmount ?? entry.expectedAmount);
      const expecteds = entries.map((entry) => entry.expectedAmount);
      const hours = entries.map((entry) => {
        const start = parseISO(entry.shiftStart);
        const end = parseISO(entry.shiftEnd);
        return Math.max(differenceInHours(end, start), 1);
      });

      return {
        sourceType: sourceType as SourcePerformance["sourceType"],
        shifts: entries.length,
        totalActual: sum(actuals),
        totalExpected: sum(expecteds),
        averageActual: entries.length === 0 ? 0 : sum(actuals) / entries.length,
        averageExpected: entries.length === 0 ? 0 : sum(expecteds) / entries.length,
        averageHours: entries.length === 0 ? 0 : sum(hours) / entries.length,
        reliabilityScore:
          entries.length === 0
            ? 0
            : sum(entries.map((entry) => getReliabilityWeight(entry.reliability))) / entries.length,
      };
    })
    .sort((left, right) => right.totalActual - left.totalActual);

  return {
    monthSpend,
    projectedMonthSpend,
    confirmedInflow,
    weightedPlannedInflow,
    next14DaySupport: confirmedInflow + weightedPlannedInflow,
    next14DayProjectedSpend: next14DaySpend,
    sourcePerformance,
    upcomingIncome: upcomingIncome.slice(0, 6),
  };
}

function findSimilarSpend(records: ExpenseRecord[], itemName: string, context: PurchaseAdviceRequest["desiredContext"], now = new Date()) {
  const since = subDays(now, 21);
  const needle = itemName.toLowerCase();
  return records.find((record) => {
    const date = parseISO(record.date);
    if (isBefore(date, since)) {
      return false;
    }

    const matchesName = record.name.toLowerCase().includes(needle) || needle.includes(record.name.toLowerCase());
    if (matchesName) {
      return true;
    }

    return context !== "Essentials" && record.context === context;
  });
}

export function buildPurchaseAdvice(
  records: ExpenseRecord[],
  incomes: IncomeEntry[],
  request: PurchaseAdviceRequest,
  now = new Date(),
): PurchaseAdviceResult {
  const last180 = getWindow(records, 180, now);
  const contextSummaries = getContextSummaries(records, 30, now);
  const contextSnapshot = contextSummaries.find((summary) => summary.context === request.desiredContext);
  const highSpendThreshold = percentile(last180.map((record) => Math.abs(record.amount)), 0.9);
  const similarSpend = findSimilarSpend(records, request.itemName, request.desiredContext, now);
  const cashflow = getCashflowSnapshot(records, incomes, now);
  const projectedMonthSpend = getSummaryMetrics(records, 30, now).projectedMonthSpend;
  const lastYearPoints = getMonthlyTrend(records, incomes, now).at(-1)?.points ?? [];
  const last3Months = lastYearPoints.slice(-3);
  const medianMonthSpend =
    [...last3Months.map((point) => point.spend)].sort((left, right) => left - right)[1] ?? projectedMonthSpend;
  const projectedWithPurchase = projectedMonthSpend + request.amount;

  const riskFlags: string[] = [];
  const reasons: string[] = [];
  const suggestedActions: string[] = [];
  let score = 100;

  if (request.amount >= highSpendThreshold && highSpendThreshold > 0) {
    riskFlags.push("This is large relative to your recent 180-day purchase history.");
    score -= 18;
  } else {
    reasons.push("The price sits within the normal range of your recent purchases.");
  }

  if ((contextSnapshot?.changeRatio ?? 0) > 0.25) {
    riskFlags.push(`${request.desiredContext} spending is already hotter than the previous 30-day window.`);
    score -= request.desiredContext === "Essentials" ? 8 : 16;
  } else {
    reasons.push(`${request.desiredContext} spending is not currently spiking.`);
  }

  if (similarSpend) {
    riskFlags.push(`You bought something similar recently: ${similarSpend.name} on ${similarSpend.date}.`);
    score -= 12;
  }

  const next14Balance = cashflow.next14DaySupport - cashflow.next14DayProjectedSpend - request.amount;
  if (next14Balance < 0) {
    riskFlags.push("The purchase would eat into the next 14 days of expected support.");
    score -= request.desiredContext === "Essentials" ? 10 : 20;
  } else {
    reasons.push("Upcoming income can still support the next two weeks after this purchase.");
  }

  if (projectedWithPurchase > medianMonthSpend * 1.25) {
    riskFlags.push("With this purchase, your projected month would move well above your recent median month.");
    score -= 18;
  }

  if (request.desiredContext === "Growth") {
    reasons.push("Growth spending can justify a higher threshold when it clearly supports future earning or capability.");
    suggestedActions.push("Check whether this replaces another planned skill or course expense.");
  }

  if (request.desiredContext === "Essentials") {
    score += 8;
    reasons.push("Essential spending gets more flexibility unless short-term cash support is tight.");
  }

  if (request.urgency === "high") {
    score += request.desiredContext === "Essentials" ? 6 : 2;
  }

  if (request.desiredContext === "Holiday" || request.desiredContext === "Lifestyle" || request.desiredContext === "Social") {
    suggestedActions.push("Wait 48 hours and re-check if the urge is still there.");
    suggestedActions.push("Compare this amount against the next planned income payout.");
  }

  if (riskFlags.length === 0) {
    suggestedActions.push("Buy it and log the reason so the pattern stays interpretable later.");
  } else {
    suggestedActions.push("Set a hard price cap before paying.");
  }

  score = Math.max(0, Math.min(100, score));

  let verdict: PurchaseAdviceResult["verdict"] = "可以买";
  if (score < 45 || riskFlags.length >= 3) {
    verdict = "暂缓买";
  } else if (score < 70 || riskFlags.length >= 1) {
    verdict = "谨慎买";
  }

  const summary = (() => {
    switch (verdict) {
      case "可以买":
        return "Current spending pressure and near-term income support this purchase.";
      case "谨慎买":
        return "This can work, but there are enough warning signs that it should be a deliberate choice.";
      case "暂缓买":
        return "The current pattern says this purchase would probably add stress rather than help.";
    }
  })();

  return {
    verdict,
    desiredContext: request.desiredContext,
    summary,
    reasons,
    riskFlags,
    suggestedActions,
    affordabilityScore: score,
    analysisMode: "full",
  };
}

export function buildPromptPurchaseAdvice(
  records: ExpenseRecord[],
  incomes: IncomeEntry[],
  parsedPrompt: ParsedPurchasePrompt,
  note?: string,
  now = new Date(),
): PurchaseAdviceResult {
  if (parsedPrompt.amount == null) {
    return {
      verdict: "还缺价格",
      desiredContext: parsedPrompt.desiredContext,
      summary: "I can read the purchase type and urgency, but I still need a price to judge affordability precisely.",
      reasons: [
        `This looks like ${parsedPrompt.desiredContext} spending.`,
        parsedPrompt.isUrgencyDefaulted
          ? "Urgency was not explicit, so the guidance assumes a medium priority."
          : `The request reads as ${parsedPrompt.urgency} priority.`,
      ],
      riskFlags: ["No price was included, so cashflow pressure and affordability cannot be scored yet."],
      suggestedActions: [
        "Add the amount in your sentence, for example: 我想买 30 欧的粉底液，现在可以买么？",
        "If the timing matters, include whether it is urgent or can wait a few days.",
      ],
      affordabilityScore: 0,
      analysisMode: "needs_amount",
    };
  }

  return buildPurchaseAdvice(
    records,
    incomes,
    {
      itemName: parsedPrompt.itemName ?? "This purchase",
      amount: parsedPrompt.amount,
      desiredContext: parsedPrompt.desiredContext,
      urgency: parsedPrompt.urgency,
      note,
    },
    now,
  );
}
