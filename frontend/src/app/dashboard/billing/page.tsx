"use client"

import { BillingPlans } from "@/components/dashboard/billing-plans"
import { Badge } from "@/components/ui/badge"

export default function BillingPage() {
  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Facturation</h1>
          <p className="text-sm text-muted-foreground">Gérez votre abonnement et vos limites d'utilisation.</p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20">Plan actuel : Pro</Badge>
      </div>

      <BillingPlans />
    </div>
  )
}
