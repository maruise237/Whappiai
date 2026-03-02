"use client"

import { useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { fetchApi } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

interface BillingPlansProps {
  cycle?: "monthly" | "yearly"
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: "2,500",
    priceYearly: "2,000",
    description: "Parfait pour débuter l'automatisation.",
    features: [
      "500 messages IA / mois",
      "1 session WhatsApp",
      "Réponses auto 24/7",
      "Support technique par email"
    ],
    cta: "Choisir Starter",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: "5,000",
    priceYearly: "4,000",
    description: "La puissance maximale pour votre business.",
    features: [
      "2,000 messages IA / mois",
      "Sessions illimitées",
      "Analyses avancées & Anti-spam",
      "Support client prioritaire",
      "Export de données & API"
    ],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: "10,000",
    priceYearly: "8,000",
    description: "Pour les équipes et la croissance.",
    features: [
      "10,000 messages IA / mois",
      "Gestionnaire de compte dédié",
      "Intégrations API sur mesure",
      "Logs d'audit & Sécurité",
      "Formation d'équipe"
    ],
    cta: "Choisir Business",
    highlighted: false,
  },
]

export function BillingPlans({ cycle = "monthly" }: BillingPlansProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const { getToken } = useAuth()

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId)
      const token = await getToken()
      const response = await fetchApi('/api/v1/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId, cycle }),
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.url) {
        window.location.href = response.url
      } else {
        toast.error("Impossible d'initialiser le paiement")
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
          "relative flex flex-col h-full transition-all duration-300 border-border/40 overflow-hidden rounded-2xl group",
          plan.highlighted ? "border-primary/50 shadow-2xl shadow-primary/10 scale-105 z-10 bg-card" : "bg-card/50 hover:bg-card hover:border-border/80"
        )}>
          {plan.highlighted && (
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          )}

          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-lg font-black tracking-tight uppercase">{plan.name}</CardTitle>
              {plan.highlighted && (
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                  <Sparkles className="h-3 w-3 mr-1" /> Recommandé
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed mb-6">{plan.description}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter">
                {cycle === "monthly" ? plan.priceMonthly : plan.priceYearly}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">FCFA / mois</span>
            </div>
            {cycle === "yearly" && (
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Facturé annuellement</p>
            )}
          </CardHeader>

          <CardContent className="p-8 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-6">Ce qui est inclus :</div>
            <ul className="space-y-4">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", plan.highlighted ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium leading-tight">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter className="p-8 pt-0">
            <Button
              className={cn(
                "w-full h-12 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] transition-all",
                plan.highlighted ? "shadow-lg shadow-primary/20 hover:scale-[1.02]" : "hover:bg-muted"
              )}
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
