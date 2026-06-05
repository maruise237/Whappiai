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
    name: "Starter",
    price: "3,500 FCFA",
    description: "Pour tester et gerer un seul groupe actif.",
    features: [
      "1 groupe connecte",
      "Bienvenue dans le groupe",
      "Filtre de mots interdits jusqu'a 20",
      "Systeme avertissements + ban auto",
      "3 messages programmes actifs"
    ],
    cta: "Choisir Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "8,000 FCFA",
    description: "Pour les admins serieux qui gerent plusieurs groupes actifs.",
    features: [
      "Jusqu'a 5 groupes connectes",
      "Bienvenue dans le groupe",
      "Filtre mots illimite + anti-liens",
      "Messages programmes illimites",
      "Dashboard complet + logs"
    ],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    id: "business",
    name: "Organisation",
    price: "18,000 FCFA",
    description: "Pour associations, eglises, medias ou formations larges.",
    features: [
      "Jusqu'a 20 groupes connectes",
      "Toutes les fonctionnalites Pro",
      "Liste noire partagee entre groupes",
      "Presets de configuration",
      "Support prioritaire WhatsApp"
    ],
    cta: "Choisir Organisation",
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
