"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const plans = [
  {
    code: "starter",
    name: "Essentiel",
    price: "2 500 FCFA",
    description: "Pour lancer un premier numero co-admin sans complexite.",
    features: ["1 session WhatsApp active", "Jusqu'a 5 groupes pilotes", "Anti-liens et mots interdits", "Bienvenue quotidienne", "1 000 actions / mois"],
    highlight: false,
  },
  {
    code: "pro",
    name: "Croissance",
    price: "5 000 FCFA",
    description: "Pour les admins qui gerent plusieurs groupes.",
    features: ["3 sessions WhatsApp actives", "Groupes illimites", "Avertissements automatiques", "Messages programmes", "5 000 actions / mois"],
    highlight: true,
  },
  {
    code: "business",
    name: "Equipe",
    price: "10 000 FCFA",
    description: "Pour agences et operations multi-groupes.",
    features: ["10 sessions WhatsApp actives", "Regles avancees par groupe", "Journal d'audit", "Support prioritaire", "25 000 actions / mois"],
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl text-center">
        <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Tarifs Whappi</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Forfaits co-admin WhatsApp</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          Sessions, groupes, regles et actions mensuelles. Pas de recharge compliquee.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl gap-6 lg:grid-cols-3">
        {plans.map(plan => (
          <Card key={plan.code} className={cn("relative bg-card shadow-none", plan.highlight && "border-primary shadow-[0_24px_70px_-50px_hsl(var(--primary))]")}>
            {plan.highlight && (
              <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Recommande
              </div>
            )}
            <CardContent className="flex h-full flex-col p-6">
              <div>
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-6">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground"> / mois</span>
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
              <Button asChild className="mt-8" variant={plan.highlight ? "default" : "outline"}>
                <Link href={`/register?plan=${plan.code}`}>Commencer avec {plan.name}</Link>
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
