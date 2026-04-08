import { connection } from "next/server";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Coins,
  ReceiptText,
  Sparkles,
  Wallet,
} from "lucide-react";

import { CashflowChart } from "@/components/cashflow-chart";
import { ContextChart } from "@/components/context-chart";
import { IncomeManager } from "@/components/income-manager";
import { OverviewCard } from "@/components/overview-card";
import { PurchaseAdvicePanel } from "@/components/purchase-advice-panel";
import { SpendTrendChart } from "@/components/spend-trend-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard-data";
import { formatCurrency, formatPercent, formatShortDate } from "@/lib/utils";

function signalBadgeVariant(severity: "alert" | "watch" | "positive") {
  switch (severity) {
    case "alert":
      return "danger";
    case "watch":
      return "warning";
    case "positive":
      return "success";
  }
}

export default async function Home() {
  await connection();
  const data = await getDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[8px] border border-border-strong bg-[linear-gradient(135deg,#edf2e7_0%,#f5efdd_34%,#f2e1db_68%,#e5ecf1_100%)] p-[1px] shadow-[0_34px_80px_-48px_rgba(56,65,61,0.55)]">
        <div className="rounded-[7px] bg-[rgba(252,251,248,0.88)] backdrop-blur-sm">
          <div className="border-b border-white/55 bg-[linear-gradient(120deg,#edf3ea_0%,#f7f1de_36%,#f4e5de_70%,#e9eff6_100%)] px-5 py-5 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border border-white/70 bg-[rgba(252,251,248,0.78)] shadow-[0_20px_32px_-24px_rgba(56,65,61,0.35)]">
                <Wallet className="h-5 w-5 text-[#6f8777]" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-strong">Budget Assistant</p>
                <h1 className="font-display text-[2rem] leading-none text-foreground sm:text-[2.2rem]">
                  April dashboard
                </h1>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OverviewCard
                title="Last 30 days"
                value={data.summary30.totalSpend}
                note={`${data.summary30.transactionCount} entries, with ${formatCurrency(data.summary30.refundOffset)} in refunds offset.`}
                icon={ReceiptText}
                accent="peach"
                tone="warning"
              />
              <OverviewCard
                title="Last 90 days"
                value={data.summary90.totalSpend}
                note={`Average daily spend ${formatCurrency(data.summary90.averageDailySpend)}.`}
                icon={Activity}
                accent="mist"
              />
              <OverviewCard
                title="Projected month spend"
                value={data.summary30.projectedMonthSpend}
                note="Blended from this month’s pace, the last 6 complete months, and context-specific spending behavior."
                icon={Sparkles}
                accent="lilac"
                tone="warning"
              />
              <OverviewCard
                title="Projected inflow"
                value={data.cashflow.confirmedInflow + data.cashflow.weightedPlannedInflow}
                note="Confirmed income plus weighted planned shifts in the next 14 days."
                icon={Coins}
                accent="sage"
                tone="positive"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.42fr_0.98fr]">
              <Card className="border-[#e2cfc4] bg-[#faf3ee]">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>30-day spend vs inflow</CardTitle>
                    <Badge variant="warning">Daily trend</Badge>
                  </div>
                  <CardDescription>Short-horizon view for day-to-day pressure and recovery.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SpendTrendChart data={data.dailyTrends} />
                </CardContent>
              </Card>

              <Card className="border-[#ced9e4] bg-[#f2f6fa]">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Monthly cashflow view</CardTitle>
                    <Badge variant="info">12 months by year</Badge>
                  </div>
                  <CardDescription>Swipe through the years, then review the full 12-month spend, inflow, and net trend.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CashflowChart data={data.monthlyTrends} />
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-[#d7d0e5] bg-[#f5f1f9]">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Spend context breakdown</CardTitle>
                    <Badge variant="neutral">Context mix</Badge>
                  </div>
                  <CardDescription>
                    The decision layer groups raw Notion categories into contexts like Essentials, Social, and Holiday.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ContextChart data={data.contexts30} />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {data.contexts30.slice(0, 6).map((context) => (
                      <div key={context.context} className="rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.72)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">{context.context}</p>
                          <Badge variant={context.changeRatio > 0.25 ? "warning" : "neutral"}>
                            {formatPercent(context.changeRatio)}
                          </Badge>
                        </div>
                        <p className="mt-2 font-display text-[1.4rem] leading-none text-foreground">
                          {formatCurrency(context.spend)}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          {context.transactionCount} entries in the last 30 days.
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#e2d3bf] bg-[#fbf5eb]">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Recent signals</CardTitle>
                    <Badge variant="warning">Decision cues</Badge>
                  </div>
                  <CardDescription>Quick reads the purchase engine will use before making a call.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.signals.map((signal) => (
                    <div key={signal.title} className="rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.72)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{signal.title}</p>
                        <Badge variant={signalBadgeVariant(signal.severity)}>{signal.severity}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-strong">{signal.detail}</p>
                    </div>
                  ))}
                  <div className="rounded-[8px] border border-dashed border-[#d5c8b7] bg-[rgba(255,253,250,0.72)] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <AlertCircle className="h-4 w-4 text-[#b58e86]" />
                      Why this matters
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-strong">
                      Holiday, Social, and Lifestyle spending are judged more strictly when the context is already heating
                      up or the next two weeks of income look thin.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-[#d2dccd] bg-[#f4f7f1]">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Recent expenses</CardTitle>
                    <Badge variant="success">Fresh entries</Badge>
                  </div>
                  <CardDescription>Latest Notion-synced entries, already translated into decision contexts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.recentExpenses.length === 0 ? (
                    <div className="rounded-[8px] border border-dashed border-border-strong p-4 text-sm text-muted">
                      Add your Notion token to start syncing expenses.
                    </div>
                  ) : (
                    data.recentExpenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between gap-4 rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{expense.name}</p>
                            <Badge variant="neutral">{expense.context}</Badge>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted">
                            {formatShortDate(expense.date)}
                            {expense.comment ? ` · ${expense.comment}` : ""}
                            {expense.paymentMethod ? ` · ${expense.paymentMethod}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(expense.amount)}</p>
                          <p className="text-xs text-muted">{expense.categories.join(", ") || "Uncategorized"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#e0d2c2] bg-[#f8f2ec]">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Cashflow outlook</CardTitle>
                    <Badge variant="danger">Next 14 days</Badge>
                  </div>
                  <CardDescription>What the next two weeks can reasonably carry.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4">
                      <p className="text-sm text-muted">Confirmed inflow</p>
                      <p className="mt-2 font-display text-[1.5rem] leading-none text-foreground">
                        {formatCurrency(data.cashflow.confirmedInflow)}
                      </p>
                    </div>
                    <div className="rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4">
                      <p className="text-sm text-muted">Weighted planned</p>
                      <p className="mt-2 font-display text-[1.5rem] leading-none text-foreground">
                        {formatCurrency(data.cashflow.weightedPlannedInflow)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <ArrowUpRight className="h-4 w-4 text-[#8b9cb2]" />
                      Upcoming payouts
                    </div>
                    <div className="mt-3 space-y-2">
                      {data.cashflow.upcomingIncome.length === 0 ? (
                        <p className="text-sm text-muted">No upcoming income is logged yet.</p>
                      ) : (
                        data.cashflow.upcomingIncome.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{entry.sourceType.replaceAll("_", " ")}</p>
                              <p className="text-xs text-muted">
                                {entry.payoutDate} · {entry.status} · {entry.reliability}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-muted-strong">
                              {formatCurrency(entry.actualAmount ?? entry.expectedAmount)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <IncomeManager
                recentIncome={data.recentIncome}
                sourcePerformance={data.cashflow.sourcePerformance}
              />
              <PurchaseAdvicePanel />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
