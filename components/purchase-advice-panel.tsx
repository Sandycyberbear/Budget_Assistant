"use client";

import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parsePurchasePrompt } from "@/lib/prompt-parser";
import type { PurchaseAdviceResponse } from "@/lib/types";

export function PurchaseAdvicePanel() {
  const [prompt, setPrompt] = useState("我能买 80 欧的护肤品吗？");
  const parsedPrompt = useMemo(() => parsePurchasePrompt(prompt), [prompt]);
  const [result, setResult] = useState<PurchaseAdviceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    startTransition(async () => {
      const response = await fetch("/api/purchase-advice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to generate guidance right now.");
        return;
      }

      setResult(payload);
    });
  }

  const parseNotes = [
    parsedPrompt.missingFields.includes("amount") ? "Price not found yet, so the final verdict will stay approximate." : null,
    parsedPrompt.missingFields.includes("itemName") ? "Item name is still unclear, so the guidance will treat this as a generic purchase." : null,
    parsedPrompt.isContextInferred ? "Context is inferred from the wording in your message." : "Context is explicitly stated in your message.",
    parsedPrompt.isUrgencyDefaulted ? "Priority was not explicit, so it defaults to medium." : null,
    parsedPrompt.unparsedRemainder ? `Still not fully parsed: ${parsedPrompt.unparsedRemainder}` : null,
  ].filter(Boolean) as string[];

  const previewRows = [
    {
      label: "Item",
      value: parsedPrompt.itemName ?? "Not detected yet",
      badge: parsedPrompt.isItemNameInferred ? "Guess" : "Detected",
      variant: parsedPrompt.isItemNameInferred ? "warning" : "success",
    },
    {
      label: "Amount",
      value: parsedPrompt.amount == null ? "Not detected yet" : `${parsedPrompt.amount.toFixed(2)} EUR`,
      badge:
        parsedPrompt.amount == null ? "Missing" : parsedPrompt.isAmountInferred ? "Inferred" : "Detected",
      variant:
        parsedPrompt.amount == null
          ? "warning"
          : parsedPrompt.isAmountInferred
            ? "neutral"
            : "success",
    },
    {
      label: "Context",
      value: parsedPrompt.desiredContext,
      badge: parsedPrompt.isContextInferred ? "Inferred" : "Explicit",
      variant: parsedPrompt.isContextInferred ? "neutral" : "success",
    },
    {
      label: "Priority",
      value: parsedPrompt.urgency,
      badge: parsedPrompt.isUrgencyDefaulted ? "Default" : "Detected",
      variant: parsedPrompt.isUrgencyDefaulted ? "neutral" : "success",
    },
  ] as const;

  function verdictVariant(verdict: PurchaseAdviceResponse["verdict"]) {
    switch (verdict) {
      case "可以买":
        return "success";
      case "谨慎买":
      case "还缺价格":
        return "warning";
      case "暂缓买":
        return "danger";
    }
  }

  return (
    <Card className="h-full border-[#d8d0e4] bg-[#f4f0f8]">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Purchase guidance</CardTitle>
          <Badge variant="neutral">Decision lab</Badge>
        </div>
        <CardDescription>
          Describe the purchase in one sentence and the app will read the item, price, context, and priority for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4 rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="prompt">Ask the question</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="我想买 30 欧的粉底液，日常用品，中优先级，现在可以买么？"
            />
          </div>

          <div className="space-y-3 rounded-[8px] border border-[#ddd6e7] bg-[rgba(244,240,248,0.75)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Detected from your message</p>
              <Badge variant="neutral">Auto parse</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {previewRows.map((row) => (
                <div key={row.label} className="rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.86)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-strong">{row.label}</p>
                    <Badge variant={row.variant}>{row.badge}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">{row.value}</p>
                </div>
              ))}
            </div>

            {parseNotes.length ? (
              <ul className="space-y-1 text-sm leading-6 text-muted-strong">
                {parseNotes.map((note) => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !prompt.trim()}>
            {isPending ? "Thinking..." : "Get guidance"}
          </Button>
        </form>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {result ? (
          <div className="space-y-4 rounded-[8px] border border-white/70 bg-[rgba(255,253,250,0.74)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Verdict</p>
                <p className="text-xl font-semibold text-foreground">{result.verdict}</p>
              </div>
              <Badge variant={verdictVariant(result.verdict)}>
                {result.analysisMode === "needs_amount"
                  ? "Need price"
                  : `Score ${result.affordabilityScore}`}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-muted-strong">{result.summary}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[8px] border border-white/70 bg-[rgba(244,240,248,0.58)] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-strong">Parsed context</p>
                <p className="mt-2 text-sm font-medium text-foreground">{result.parsedPrompt.desiredContext}</p>
              </div>
              <div className="rounded-[8px] border border-white/70 bg-[rgba(244,240,248,0.58)] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-strong">Parsed priority</p>
                <p className="mt-2 text-sm font-medium text-foreground">{result.parsedPrompt.urgency}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Why</p>
              <ul className="space-y-1 text-sm leading-6 text-muted-strong">
                {result.reasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>

            {result.riskFlags.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Risk flags</p>
                <ul className="space-y-1 text-sm leading-6 text-muted-strong">
                  {result.riskFlags.map((flag) => (
                    <li key={flag}>- {flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Better next step</p>
              <ul className="space-y-1 text-sm leading-6 text-muted-strong">
                {result.suggestedActions.map((action) => (
                  <li key={action}>- {action}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
