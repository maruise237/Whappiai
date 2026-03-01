"use client"

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { fetchApi } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "2,500 FCFA",
    features: [
      "500 messages IA / mois",
      "1 session WhatsApp",
      "Réponses auto 24/7",
      "Support technique par email",
      "Accès API standard"
    ],
    cta: "Choisir Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "5,000 FCFA",
    features: [
      "2,000 messages IA / mois",
      "Groupes WhatsApp illimités",
      "Analyses avancées",
      "Anti-spam intelligent",
      "Support client prioritaire",
      "Export de données (CSV/JSON)"
    ],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "10,000 FCFA",
    features: [
      "10,000 messages IA / mois",
      "Tout ce qui est dans Pro",
      "Gestionnaire de compte dédié",
      "Intégrations API personnalisées",
      "Logs d"audit & Sécurité",
      "Sessions de formation d"équipe"
    ],
    cta: "Choisir Business",
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
      const response = await fetchApi("/api/v1/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.url) {
        window.location.href = response.url
      } else {
        toast.error("Impossible d"initialiser le paiement")
      }
    } catch (error) {
      toast.error("Une erreur inattendue est survenue")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card key={plan.id} className={cn(
          "relative flex flex-col h-full border-border bg-card",
          plan.highlighted && "border-primary ring-1 ring-primary"
        )}>
          {plan.highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              Le plus populaire
            </div>
          )}
          <CardHeader className="p-6 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">{plan.name}</CardTitle>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-xs text-muted-foreground">/mois</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1">
            <ul className="space-y-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-3.5 w-3.5 text-primary mt-0.5" />
                  <span className="text-xs text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Button
              className="w-full"
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
