"use client"

import { BillingPlans } from "@/components/dashboard/billing-plans"
import { Badge } from "@/components/ui/badge"

export default function BillingPage() {
  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold">Facturation</h1>
          <p className="text-sm text-muted-foreground">Gérez votre abonnement et vos limites d&apos;utilisation.</p>
        </div>
        <Badge className="w-fit bg-primary/10 text-primary border-primary/20">Plan actuel : Pro</Badge>
      </div>

      <BillingPlans />
    </div>
  )
}
