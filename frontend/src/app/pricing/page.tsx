"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PLAN_CARDS } from "@/lib/plan-features"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl text-center">
        <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Tarifs Whappi</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Forfaits co-admin WhatsApp</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          7 jours d&apos;essai gratuit avec 1 groupe, puis trois offres simples pour proteger, automatiser et monter en puissance.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_CARDS.map(plan => (
          <Card
            key={plan.id}
            className={cn(
              "relative bg-card shadow-none",
              plan.highlighted && "border-primary shadow-[0_24px_70px_-50px_hsl(var(--primary))]",
              plan.id === "trial" && "border-state-warning/30 bg-state-warning-light/35"
            )}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground sm:left-6">
                Recommande
              </div>
            )}
            <CardContent className="flex h-full flex-col p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 min-h-12 text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-6">
                  <span className="text-3xl font-semibold tracking-tight sm:text-4xl">{plan.price}</span>
                  <span className="text-sm text-muted-foreground"> {plan.cadence}</span>
                </p>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map(feature => (
                  <li key={feature} className="flex gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8" variant={plan.highlighted ? "default" : "outline"}>
                <Link href={`/register?plan=${plan.id}`}>{plan.id === "trial" ? "Commencer l'essai" : `Commencer avec ${plan.name}`}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link href="/dashboard/billing" className="text-sm font-medium text-primary hover:underline">
          Gerer mon abonnement
        </Link>
      </div>
    </div>
  )
}
