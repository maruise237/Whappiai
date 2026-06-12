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
    name: "Starter",
    price: "3 500 FCFA",
    description: "Pour moderer simplement jusqu'a 3 groupes avec les regles essentielles.",
    features: [
      "Jusqu'a 3 groupes",
      "Blocage des liens",
      "Mots interdits choisis manuellement",
      "Auto-exclusion activable",
      "Message de bienvenue redige par vous",
    ],
    highlight: false,
  },
  {
    code: "pro",
    name: "Pro IA",
    price: "8 000 FCFA",
    description: "Pour aller plus loin avec l'IA sur jusqu'a 6 groupes.",
    features: [
      "Jusqu'a 6 groupes",
      "Toute la moderation Starter",
      "Assistant IA pour aider l'admin",
      "Fonctions IA plus poussees",
      "Automatisations plus confortables",
    ],
    highlight: true,
  },
  {
    code: "business",
    name: "Business",
    price: "18 000 FCFA",
    description: "Pour les structures qui veulent plus de puissance sur jusqu'a 16 groupes.",
    features: [
      "Jusqu'a 16 groupes",
      "Tout le plan Pro IA",
      "Fonctionnalites avancees",
      "Administration plus poussee",
      "Priorite sur les evolutions premium",
    ],
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
          7 jours d&apos;essai gratuit avec 1 groupe, puis trois offres simples pour moderer, automatiser et monter en puissance.
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
