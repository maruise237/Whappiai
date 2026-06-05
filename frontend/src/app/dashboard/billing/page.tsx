"use client"

import * as React from "react"
import { CreditCard, Gift, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BillingPlans } from "@/components/dashboard/billing-plans"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { getPlanCode, getPlanLabel, PlanBadge } from "@/components/dashboard/plan-badge"

export default function BillingPage() {
  const { getToken } = useAuth()
  const [activePlan, setActivePlan] = React.useState("trial")
  const [isPlanLoading, setIsPlanLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    async function fetchPlan() {
      setIsPlanLoading(true)
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
          setActivePlan(resolveActivePlan(userProfile, subscription))
        }
      } catch {
        if (mounted) setActivePlan("trial")
      } finally {
        if (mounted) setIsPlanLoading(false)
      }
    }
    fetchPlan()
    return () => {
      mounted = false
    }
  }, [getToken])

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <CreditCard className="h-5 w-5 text-primary" /> Abonnement & plans
          </h1>
          <p className="text-sm text-muted-foreground">Choisissez l&apos;offre adaptee au nombre de groupes WhatsApp a gerer.</p>
        </div>

        {isPlanLoading ? (
          <span className="h-auto rounded-full border px-4 py-1.5 text-[10px] font-semibold text-muted-foreground">
            Synchronisation forfait...
          </span>
        ) : (
          <PlanBadge plan={activePlan} active className="h-auto rounded-full px-4 py-1.5" />
        )}
      </div>

      <Card className="border-primary/25 bg-primary/5 shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary">{isPlanLoading ? "Synchronisation du forfait" : billingBannerTitle(activePlan)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPlanLoading ? "Whappi verifie le forfait actif de ce compte." : billingBannerText(activePlan)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border bg-card px-4 py-3 text-left sm:text-right">
            <p className="text-xs text-muted-foreground">{isPlanLoading ? "Statut" : activePlan === "trial" ? "Expire dans" : "Forfait actif"}</p>
            <p className="text-lg font-bold text-primary">{isPlanLoading ? "..." : activePlan === "trial" ? "7 jours" : getPlanLabel(activePlan)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="mb-10 space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Offres co-admin WhatsApp</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Starter pour tester, Pro pour plusieurs groupes, Organisation pour les communautes larges.
          </p>
        </div>

        <BillingPlans />
      </div>

      <Card className="mt-12 border-2 border-dashed bg-transparent">
        <CardContent className="flex flex-col items-center gap-6 p-6 md:flex-row">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1 text-center md:text-left">
            <h3 className="text-sm font-bold">Besoin d&apos;une solution sur-mesure ?</h3>
            <p className="text-xs text-muted-foreground">
              Pour les agences, reseaux de vente ou operations multi-pays, on peut adapter les sessions, les volumes et le suivi.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full">Contacter le support</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function billingBannerTitle(plan: string) {
  if (plan === "trial") return "Essai gratuit en cours"
  return `Forfait ${getPlanLabel(plan)} actif`
}

function billingBannerText(plan: string) {
  if (plan === "starter") return "Inclus : 1 groupe - 3 messages programmes - 20 mots interdits."
  if (plan === "pro") return "Inclus : 5 groupes - messages programmes illimites - moderation complete."
  if (plan === "business") return "Inclus : 20 groupes - support prioritaire - configuration avancee."
  return "Inclus : 1 groupe - 3 messages programmes - toutes les regles de base."
}

type PlanSource = {
  plan_id?: unknown
  plan?: unknown
  subscription_plan?: unknown
  plan_code?: unknown
}

function resolveActivePlan(userProfile: PlanSource | null, subscription: PlanSource | null) {
  return getPlanCode(
    subscription?.plan_code ||
    subscription?.plan_id ||
    userProfile?.plan_id ||
    userProfile?.plan ||
    userProfile?.subscription_plan ||
    "trial"
  )
}
