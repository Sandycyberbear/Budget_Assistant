"use client";

import { useSyncExternalStore } from "react";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { chartTheme } from "@/lib/chart-theme";
import type { ContextSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ContextChartProps = {
  data: ContextSummary[];
};

export function ContextChart({ data }: ContextChartProps) {
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
        <BarChart data={data.slice(0, 6)} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: chartTheme.tick, fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="context"
            tick={{ fill: chartTheme.tickStrong, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
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
          <Bar dataKey="spend" fill={chartTheme.context} radius={[6, 6, 6, 6]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
