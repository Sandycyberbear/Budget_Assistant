import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

type OverviewCardAccent = "sage" | "mist" | "peach" | "lilac";

const accentStyles: Record<
  OverviewCardAccent,
  {
    card: string;
    iconWrap: string;
    icon: string;
    note: string;
  }
> = {
  sage: {
    card: "border-[#ccd8c7] bg-[#eef4eb]",
    iconWrap: "bg-[#dce8d7]",
    icon: "text-[#6f8869]",
    note: "text-[#6a7468]",
  },
  mist: {
    card: "border-[#cfd9e5] bg-[#edf3f8]",
    iconWrap: "bg-[#dde8f2]",
    icon: "text-[#70859a]",
    note: "text-[#687585]",
  },
  peach: {
    card: "border-[#e2cfc4] bg-[#f7ede7]",
    iconWrap: "bg-[#f2ddd2]",
    icon: "text-[#a27766]",
    note: "text-[#78665d]",
  },
  lilac: {
    card: "border-[#d9d0e4] bg-[#f3eef8]",
    iconWrap: "bg-[#e6ddef]",
    icon: "text-[#7d718f]",
    note: "text-[#716878]",
  },
};

type OverviewCardProps = {
  title: string;
  value: number;
  note: string;
  icon: LucideIcon;
  tone?: "neutral" | "positive" | "warning";
  accent?: OverviewCardAccent;
  compact?: boolean;
};

export function OverviewCard({
  title,
  value,
  note,
  icon: Icon,
  tone = "neutral",
  accent = "sage",
  compact = false,
}: OverviewCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card className={styles.card}>
      <CardHeader className="gap-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-[8px]", styles.iconWrap)}>
            <Icon className={cn("h-[18px] w-[18px]", styles.icon)} />
          </div>
          <Badge
            variant={tone === "positive" ? "success" : tone === "warning" ? "warning" : "neutral"}
          >
            {tone === "positive" ? <ArrowDown className="mr-1 h-3 w-3" /> : null}
            {tone === "warning" ? <ArrowUp className="mr-1 h-3 w-3" /> : null}
            {tone === "neutral" ? "Live" : tone === "positive" ? "Steady" : "Watch"}
          </Badge>
        </div>
        <div className="space-y-1">
          <CardTitle className="text-sm text-muted-strong">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-display text-[2rem] leading-none text-foreground">
          {compact ? formatCompactCurrency(value) : formatCurrency(value)}
        </p>
        <p className={cn("text-sm leading-6", styles.note)}>{note}</p>
      </CardContent>
    </Card>
  );
}
