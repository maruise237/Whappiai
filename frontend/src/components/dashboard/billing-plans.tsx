"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { fetchApi } from "@/lib/api"
import { emitWappyEvent } from "@/lib/wappy-events"
import { useAuth } from "@clerk/clerk-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { getPlanCode, PlanBadge } from "@/components/dashboard/plan-badge"

export function BillingPlans({
  activePlan = "trial",
  recommendedPlan = "pro",
}: {
  activePlan?: string
  recommendedPlan?: string | null
}) {
  const { t } = useTranslation("billing")
  const [loading, setLoading] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const { getToken } = useAuth()
  const normalizedActivePlan = getPlanCode(activePlan)
  const normalizedRecommendedPlan = recommendedPlan ? getPlanCode(recommendedPlan) : null

  const plans = [
    {
      id: "trial",
      name: "Essai gratuit",
      price: "7 jours",
      description: "Pour connecter 1 groupe et verifier que Whappi modere bien en situation reelle.",
      features: [
        "1 groupe pendant 7 jours",
        "Blocage des liens",
        "Mots interdits choisis manuellement",
        "Auto-exclusion activable",
        "Message de bienvenue redige par vous",
      ],
      cta: "Essai en cours",
      highlighted: false,
      disabled: true,
    },
    {
      id: "starter",
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
      cta: "Passer sur Starter",
      highlighted: normalizedRecommendedPlan === "starter",
    },
    {
      id: "pro",
      name: "Pro IA",
      price: "8 000 FCFA",
      description: "Pour aller plus loin avec l'IA sur jusqu'a 6 groupes.",
      features: [
        "Jusqu'a 6 groupes",
        "Toute la moderation Starter",
        "Presets de moderation rapides",
        "Assistant IA pour aider l'admin",
        "Generation IA pour vos groupes",
        "Messages programmes inclus",
      ],
      cta: "Passer sur Pro IA",
      highlighted: normalizedRecommendedPlan === "pro",
    },
    {
      id: "business",
      name: "Business",
      price: "18 000 FCFA",
      description: "Pour les structures qui veulent plus de puissance sur jusqu'a 16 groupes.",
      features: [
        "Jusqu'a 16 groupes",
        "Tout le plan Pro IA",
        "Messages programmes sans limite",
        "Generation IA pour vos groupes",
        "Protection etendue sur plus de groupes",
      ],
      cta: "Passer sur Business",
      highlighted: normalizedRecommendedPlan === "business",
    },
  ]

  const comparisonRows = [
    { feature: "Periode d'essai", starter: "Apres essai", pro: "Apres essai", business: "Apres essai" },
    { feature: "Groupes geres", starter: "3", pro: "6", business: "16" },
    { feature: "Blocage des liens", starter: "Inclus", pro: "Inclus", business: "Inclus" },
    { feature: "Mots interdits", starter: "Personnalises", pro: "Personnalises", business: "Personnalises" },
    { feature: "Auto-exclusion", starter: "Inclus", pro: "Inclus", business: "Inclus" },
    { feature: "Message de bienvenue manuel", starter: "Inclus", pro: "Inclus", business: "Inclus" },
    { feature: "Presets de moderation", starter: "-", pro: "Inclus", business: "Inclus" },
    { feature: "Assistant IA", starter: "-", pro: "Inclus", business: "Inclus" },
    { feature: "Generation IA", starter: "-", pro: "Inclus", business: "Inclus" },
    { feature: "Messages programmes", starter: "-", pro: "Inclus", business: "Sans limite" },
  ]

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId)
      emitWappyEvent({ type: "billing", action: "checkout-started", planId })
      const token = await getToken()
      const response = await fetchApi('/api/v1/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId,
        }),
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.url) {
        window.location.href = response.url
      } else {
        toast.error(t("toast_payment_error"))
        emitWappyEvent({ type: "billing", action: "checkout-failed", planId })
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : t("toast_generic_error"))
      emitWappyEvent({ type: "billing", action: "checkout-failed", planId })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={cn(
            "relative flex h-full flex-col overflow-visible transition-transform",
            plan.highlighted
              ? "scale-[1.02] border-2 border-primary bg-primary/5 shadow-lg shadow-primary/10"
              : "border border-border bg-card",
            plan.id === "trial" && "border-state-warning/30 bg-state-warning-light/35",
            getPlanCode(plan.id) === normalizedActivePlan && "ring-2 ring-primary/15"
          )}>
          {plan.highlighted && (
            <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow hover:bg-primary sm:px-4 sm:text-sm">
              {t("plan_badge_recommended")}
            </Badge>
          )}

          <CardHeader className="p-4 pb-2 md:p-5 md:pb-2">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold tracking-tight">{plan.name}</CardTitle>
              {getPlanCode(plan.id) === normalizedActivePlan && <PlanBadge plan={normalizedActivePlan} active />}
            </div>
            <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{plan.description}</p>
            <div className="mt-4 flex flex-wrap items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {plan.id === "trial" ? "sans engagement" : t("per_month")}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 md:p-5">
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
          <CardFooter className="p-4 pt-0 md:p-5 md:pt-0">
            <Button
              className="h-10 w-full"
              variant={plan.highlighted ? "default" : "outline"}
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading === plan.id || Boolean(plan.disabled)}
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
          {t("compare_button")}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("compare_col_feature")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("compare_col_starter")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("compare_col_pro")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{t("compare_col_business")}</th>
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
