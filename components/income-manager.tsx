"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { IncomeEntry, SourcePerformance } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type IncomeManagerProps = {
  recentIncome: IncomeEntry[];
  sourcePerformance: SourcePerformance[];
};

const initialForm = {
  sourceType: "milk_tea_shop",
  shiftStart: "",
  shiftEnd: "",
  expectedAmount: "",
  actualAmount: "",
  status: "planned",
  reliability: "medium",
  payoutDate: "",
  note: "",
};

export function IncomeManager({ recentIncome, sourcePerformance }: IncomeManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField<Key extends keyof typeof initialForm>(key: Key, value: (typeof initialForm)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/income", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceType: form.sourceType,
          shiftStart: new Date(form.shiftStart).toISOString(),
          shiftEnd: new Date(form.shiftEnd).toISOString(),
          expectedAmount: Number(form.expectedAmount),
          actualAmount: form.actualAmount ? Number(form.actualAmount) : null,
          status: form.status,
          reliability: form.reliability,
          payoutDate: form.payoutDate,
          note: form.note,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to save income.");
        return;
      }

      setForm(initialForm);
      router.refresh();
    });
  }

  return (
    <Card className="h-full border-[#ced9e2] bg-[#f1f6fa]">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Income rhythm</CardTitle>
          <Badge variant="info">Shift planner</Badge>
        </div>
        <CardDescription>
          Track planned, confirmed, and received shifts so the advice engine can stay realistic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4 rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sourceType">Source</Label>
              <Select
                id="sourceType"
                value={form.sourceType}
                onChange={(event) => updateField("sourceType", event.target.value)}
              >
                <option value="milk_tea_shop">Milk tea shop</option>
                <option value="bar">Bar</option>
                <option value="part_time">Part-time</option>
                <option value="online_shop">Online shop</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="planned">Planned</option>
                <option value="confirmed">Confirmed</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shiftStart">Shift start</Label>
              <Input
                id="shiftStart"
                type="datetime-local"
                value={form.shiftStart}
                onChange={(event) => updateField("shiftStart", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shiftEnd">Shift end</Label>
              <Input
                id="shiftEnd"
                type="datetime-local"
                value={form.shiftEnd}
                onChange={(event) => updateField("shiftEnd", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="expectedAmount">Expected</Label>
              <Input
                id="expectedAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.expectedAmount}
                onChange={(event) => updateField("expectedAmount", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualAmount">Actual</Label>
              <Input
                id="actualAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.actualAmount}
                onChange={(event) => updateField("actualAmount", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reliability">Reliability</Label>
              <Select
                id="reliability"
                value={form.reliability}
                onChange={(event) => updateField("reliability", event.target.value)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payoutDate">Payout date</Label>
              <Input
                id="payoutDate"
                type="date"
                value={form.payoutDate}
                onChange={(event) => updateField("payoutDate", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" value={form.note} onChange={(event) => updateField("note", event.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving..." : "Add income shift"}
          </Button>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>

        <div className="space-y-3 rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Source performance</p>
            <Badge variant="info">Last synced locally</Badge>
          </div>
          <div className="space-y-2">
            {sourcePerformance.length === 0 ? (
              <p className="text-sm text-muted">Add your first shift to start seeing which sources are steadier.</p>
            ) : (
              sourcePerformance.slice(0, 4).map((source) => (
                <div
                  key={source.sourceType}
                  className="flex items-center justify-between rounded-[8px] border border-border bg-surface-soft px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{source.sourceType.replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted">
                      {source.shifts} shifts · avg {source.averageHours.toFixed(1)}h
                    </p>
                  </div>
                  <p className="text-sm font-medium text-muted-strong">{formatCurrency(source.averageActual)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4">
          <p className="text-sm font-medium text-foreground">Recent entries</p>
          <div className="space-y-2">
            {recentIncome.length === 0 ? (
              <p className="text-sm text-muted">No income entries yet.</p>
            ) : (
              recentIncome.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-[8px] border border-border bg-surface-soft px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.sourceType.replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted">
                      {entry.payoutDate} · {entry.status}
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
  );
}
