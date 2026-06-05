"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { fetchApi } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

const plans = [
  {
    id: "starter",
    name: "Essentiel",
    price: "2,500 FCFA",
    description: "Pour lancer un premier numero co-admin sans complexite.",
    features: [
      "1 session WhatsApp active",
      "Jusqu'a 5 groupes pilotes",
      "Regles anti-liens et bienvenue",
      "1,000 actions de moderation / mois",
      "Historique essentiel des actions"
    ],
    cta: "Choisir Essentiel",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Croissance",
    price: "5,000 FCFA",
    description: "Le bon plan pour admins de communautes et vendeurs WhatsApp.",
    features: [
      "3 sessions WhatsApp actives",
      "Groupes WhatsApp illimites",
      "Anti-liens, bienvenue et avertissements",
      "5,000 actions de moderation / mois",
      "Suivi prioritaire des incidents"
    ],
    cta: "Choisir Croissance",
    highlighted: true,
  },
  {
    id: "business",
    name: "Equipe",
    price: "10,000 FCFA",
    description: "Pour agences, reseaux de vente et operations multi-groupes.",
    features: [
      "10 sessions WhatsApp actives",
      "Regles avancees par groupe",
      "Journal d'audit pour equipe",
      "25,000 actions de moderation / mois",
      "Accompagnement prioritaire"
    ],
    cta: "Choisir Equipe",
    highlighted: false,
  },
]

export function BillingPlans() {
  const [loading, setLoading] = useState<string | null>(null)
  const { getToken } = useAuth()

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId)
      const token = await getToken()
      const response = await fetchApi('/api/v1/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId }),
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.url) {
        window.location.href = response.url
      } else {
        toast.error("Impossible d'initialiser le paiement")
      }
    } catch (error) {
      console.error(error)
      toast.error("Une erreur inattendue est survenue")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.id} className={cn(
          "relative flex h-full flex-col overflow-hidden bg-card",
          plan.highlighted && "border-primary shadow-[0_24px_70px_-50px_hsl(var(--primary))]"
        )}>
          {plan.highlighted && (
            <div className="h-1 bg-primary" />
          )}

          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold tracking-tight">{plan.name}</CardTitle>
              {plan.highlighted && (
                <Badge className="border-primary/20 bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10">
                  Recommande
                </Badge>
              )}
            </div>
            <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{plan.description}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">/ mois</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-5">
            <ul className="space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-xs leading-5 text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="p-5 pt-0">
            <Button
              className="h-10 w-full"
              variant={plan.highlighted ? "default" : "outline"}
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading === plan.id}
            >
              {loading === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : plan.cta}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
