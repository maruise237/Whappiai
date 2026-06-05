"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { api, fetchApi } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { getPlanCode, PlanBadge } from "@/components/dashboard/plan-badge"

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
    description: "Pour associations, medias, formations ou reseaux larges.",
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
  const [showComparison, setShowComparison] = useState(false)
  const [activePlan, setActivePlan] = useState("trial")
  const { getToken } = useAuth()

  useEffect(() => {
    let mounted = true
    async function fetchPlan() {
      try {
        const token = await getToken()
        const [profileResult, subscriptionResult] = await Promise.allSettled([
          api.auth.check(token || undefined),
          api.subscriptions.current(token || undefined),
        ])
        const profile = profileResult.status === "fulfilled" ? profileResult.value : null
        const subscription = subscriptionResult.status === "fulfilled" ? subscriptionResult.value : null
        const userProfile = profile?.user || profile
        if (mounted) {
          setActivePlan(getPlanCode(
            subscription?.plan_code ||
            subscription?.plan_id ||
            userProfile?.plan_id ||
            userProfile?.plan ||
            userProfile?.subscription_plan ||
            "trial"
          ))
        }
      } catch {
        if (mounted) setActivePlan("trial")
      }
    }
    fetchPlan()
    return () => {
      mounted = false
    }
  }, [getToken])

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={cn(
            "relative flex h-full flex-col overflow-visible transition-transform",
            plan.highlighted
              ? "scale-[1.02] border-2 border-primary bg-primary/5 shadow-lg shadow-primary/10"
              : "border border-border bg-card",
            getPlanCode(plan.id) === activePlan && "ring-2 ring-primary/15"
          )}>
          {plan.highlighted && (
            <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground shadow hover:bg-primary">
              Recommande
            </Badge>
          )}

          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold tracking-tight">{plan.name}</CardTitle>
              {getPlanCode(plan.id) === activePlan && <PlanBadge plan={activePlan} active />}
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

      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => setShowComparison(prev => !prev)}
        >
          Comparer tous les plans
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showComparison && "rotate-180")} />
        </Button>
      </div>

      {showComparison && (
        <Card className="overflow-hidden shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-surface-neutral">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Feature</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Starter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Pro</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Organisation</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(row => (
                    <tr key={row.feature} className="border-b last:border-b-0">
                      <td className="px-4 py-3 text-xs font-medium">{row.feature}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.starter}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.pro}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{row.business}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const comparisonRows = [
  { feature: "Groupes connectes", starter: "1", pro: "5", business: "20" },
  { feature: "Messages programmes", starter: "3", pro: "Illimite", business: "Illimite" },
  { feature: "Filtre mots interdits", starter: "20 mots", pro: "Illimite", business: "Illimite" },
  { feature: "Anti-liens", starter: "Inclus", pro: "Inclus", business: "Inclus" },
  { feature: "Avertissements + exclusion", starter: "Inclus", pro: "Inclus", business: "Inclus" },
  { feature: "Dashboard + suivi", starter: "Basique", pro: "Complet", business: "Complet" },
  { feature: "Support prioritaire", starter: "-", pro: "-", business: "Inclus" },
]
