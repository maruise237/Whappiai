"use client"

import { Badge } from "@/components/ui/badge"
import { cn, ensureString } from "@/lib/utils"

const planMeta: Record<string, { label: string; className: string }> = {
  trial: {
    label: "Essai",
    className: "border-state-warning/30 bg-state-warning-light text-state-warning hover:bg-state-warning-light",
  },
  starter: {
    label: "Starter",
    className: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  pro: {
    label: "Pro",
    className: "border-primary/25 bg-primary/10 text-primary hover:bg-primary/10",
  },
  business: {
    label: "Organisation",
    className: "border-blue-500/25 bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 dark:text-blue-300",
  },
}

export function getPlanCode(plan?: unknown) {
  const value = ensureString(plan || "trial").toLowerCase()
  if (value.includes("starter")) return "starter"
  if (value.includes("business") || value.includes("organisation") || value.includes("organization")) return "business"
  if (value.includes("pro")) return "pro"
  if (value.includes("trial") || value.includes("essai") || value.includes("free")) return "trial"
  return value || "trial"
}

export function getPlanLabel(plan?: unknown) {
  return planMeta[getPlanCode(plan)]?.label || ensureString(plan || "Essai")
}

export function PlanBadge({
  plan,
  active = false,
  className,
}: {
  plan?: unknown
  active?: boolean
  className?: string
}) {
  const code = getPlanCode(plan)
  const meta = planMeta[code] || planMeta.trial

  return (
    <Badge className={cn(
      "border text-[10px] font-semibold",
      meta.className,
      active && "ring-2 ring-primary/15",
      className
    )}>
      {active ? "Plan actuel : " : ""}{meta.label}
    </Badge>
  )
}
