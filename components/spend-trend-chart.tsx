"use client";

import { useSyncExternalStore } from "react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartTheme } from "@/lib/chart-theme";
import type { TrendPoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type SpendTrendChartProps = {
  data: TrendPoint[];
};

export function SpendTrendChart({ data }: SpendTrendChartProps) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const tooltipFormatter = (value: number | string | readonly (number | string)[] | undefined) =>
    formatCurrency(Number(Array.isArray(value) ? value[0] ?? 0 : value ?? 0));

  if (!mounted) {
    return <div className="h-[280px] w-full rounded-[8px] bg-surface-soft" />;
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
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
            cursor={{ stroke: chartTheme.border, strokeDasharray: "4 4" }}
            labelStyle={{ color: chartTheme.tickStrong, fontWeight: 600 }}
            itemStyle={{ color: chartTheme.tickStrong }}
          />
          <Legend wrapperStyle={{ color: chartTheme.tickStrong }} />
          <Line type="monotone" dataKey="spend" stroke={chartTheme.spend} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="inflow" stroke={chartTheme.inflow} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
