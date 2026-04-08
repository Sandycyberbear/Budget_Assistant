"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartTheme } from "@/lib/chart-theme";
import type { MonthlyTrendYear } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type CashflowChartProps = {
  data: MonthlyTrendYear[];
};

export function CashflowChart({ data }: CashflowChartProps) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const tooltipFormatter = (value: number | string | readonly (number | string)[] | undefined) =>
    formatCurrency(Number(Array.isArray(value) ? value[0] ?? 0 : value ?? 0));
  const years = useMemo(() => data.map((item) => item.year), [data]);
  const latestYear = years.at(-1);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(latestYear);
  const activeYear =
    selectedYear !== undefined && years.includes(selectedYear) ? selectedYear : latestYear;
  const activeData = data.find((item) => item.year === activeYear)?.points ?? data.at(-1)?.points ?? [];

  if (!mounted) {
    return <div className="h-[280px] w-full rounded-[8px] bg-surface-soft" />;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="overflow-x-auto rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.58)] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2 snap-x snap-mandatory">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "snap-start whitespace-nowrap rounded-[8px] border px-3.5 py-1.5 text-sm transition-[background-color,border-color,color,box-shadow,transform]",
                  year === activeYear
                    ? "border-[#9baebd] bg-[#e4ebf1] text-[#5f7387] shadow-[0_12px_24px_-18px_rgba(95,115,135,0.75)]"
                    : "border-white/70 bg-[rgba(255,253,250,0.92)] text-muted hover:border-[#d5dfe8] hover:bg-surface hover:text-muted-strong",
                )}
                aria-pressed={year === activeYear}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-2 left-0 w-8 rounded-l-[8px] bg-gradient-to-r from-[#f2f6fa] to-transparent" />
        <div className="pointer-events-none absolute inset-y-2 right-0 w-8 rounded-r-[8px] bg-gradient-to-l from-[#f2f6fa] to-transparent" />
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={activeData}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartTheme.tick, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={{
                backgroundColor: chartTheme.surface,
                borderColor: chartTheme.border,
                borderRadius: 8,
                boxShadow: chartTheme.tooltipShadow,
              }}
              cursor={{ fill: chartTheme.surfaceSoft }}
              labelStyle={{ color: chartTheme.tickStrong, fontWeight: 600 }}
              itemStyle={{ color: chartTheme.tickStrong }}
            />
            <Bar dataKey="spend" fill={chartTheme.bar} radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="inflow" stroke={chartTheme.inflow} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="net" stroke={chartTheme.net} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
