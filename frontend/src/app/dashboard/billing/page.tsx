"use client"

import { BillingPlans } from "@/components/dashboard/billing-plans"
import { Badge } from "@/components/ui/badge"

export default function BillingPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your subscription and usage limits.</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20">Current Plan: Pro</Badge>
      </div>

      <BillingPlans />
    </div>
  )
}
