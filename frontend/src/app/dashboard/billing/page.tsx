"use client"

import * as React from "react"
import { BellRing, CalendarClock, CreditCard, Gift, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BillingPlans } from "@/components/dashboard/billing-plans"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { getPlanCode, getPlanLabel, PlanBadge } from "@/components/dashboard/plan-badge"
import { cn } from "@/lib/utils"

export default function BillingPage() {
  const { getToken } = useAuth()
  const [activePlan, setActivePlan] = React.useState("trial")
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null)
  const [accessState, setAccessState] = React.useState({ allowed: true, status: "active", message: "" })
  const [isPlanLoading, setIsPlanLoading] = React.useState(true)

  const refreshPlan = React.useCallback(async () => {
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
      setActivePlan(resolveActivePlan(userProfile, subscription))
      setExpiresAt(resolveExpiration(userProfile, subscription))
      setAccessState({
        allowed: subscription?.access_allowed !== false,
        status: ensureText(subscription?.status || userProfile?.plan_status || "active"),
        message: ensureText(subscription?.access_message || ""),
      })
    } catch {
      setActivePlan("trial")
      setExpiresAt(null)
      setAccessState({ allowed: false, status: "unknown", message: "Impossible de verifier le forfait." })
    } finally {
      setIsPlanLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    let mounted = true
    async function fetchPlan() {
      try {
        if (mounted) await refreshPlan()
      } catch {
        // refreshPlan already sets the fallback state.
      }
    }
    fetchPlan()
    return () => {
      mounted = false
    }
  }, [refreshPlan])

  React.useEffect(() => {
    async function syncMoneyFusionReturn() {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const tokenPay = params.get("tokenPay") || params.get("token")
      if (!tokenPay) return

      try {
        const token = await getToken()
        await api.payments.moneyFusionStatus(tokenPay, token || undefined)
        await refreshPlan()
      } catch {
        // The webhook can still complete the activation if the direct status check fails.
      }
    }

    syncMoneyFusionReturn()
  }, [getToken, refreshPlan])

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

      <Card className={cn(
        "shadow-none",
        !isPlanLoading && isExpiredDate(expiresAt)
          ? "border-destructive/25 bg-destructive/5"
          : "border-primary/25 bg-primary/5"
      )}>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary">{isPlanLoading ? "Synchronisation du forfait" : billingBannerTitle(activePlan, accessState)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPlanLoading ? "Whappi verifie le forfait actif de ce compte." : billingBannerText(activePlan, accessState)}
              </p>
              {!isPlanLoading && expiresAt && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-medium">
                    <CalendarClock className={cn("h-3.5 w-3.5", isExpiredDate(expiresAt) ? "text-destructive" : "text-primary")} />
                    {expirationDateLabel(expiresAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-medium">
                    <BellRing className="h-3.5 w-3.5 text-amber-500" />
                    Rappels J-7, J-3, J-1 et jour J
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border bg-card px-4 py-3 text-left sm:text-right">
            <p className="text-xs text-muted-foreground">{isPlanLoading ? "Statut" : "Expiration"}</p>
            <p className="text-lg font-bold text-primary">{isPlanLoading ? "..." : getExpirationSummary(expiresAt, activePlan)}</p>
            {!isPlanLoading && expiresAt && (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {accessState.allowed ? getPlanLabel(activePlan) : accessState.status}
              </p>
            )}
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

function billingBannerTitle(plan: string, accessState: { allowed: boolean }) {
  if (!accessState.allowed) return `Forfait ${getPlanLabel(plan)} expire`
  if (plan === "trial") return "Essai gratuit en cours"
  return `Forfait ${getPlanLabel(plan)} actif`
}

function billingBannerText(plan: string, accessState: { allowed: boolean; message: string }) {
  if (!accessState.allowed) return accessState.message || "Renouvelez le forfait pour relancer les automatisations Whappi."
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
  current_period_end?: unknown
  subscription_expiry?: unknown
  status?: unknown
  plan_status?: unknown
  access_allowed?: unknown
  access_message?: unknown
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

function resolveExpiration(userProfile: PlanSource | null, subscription: PlanSource | null) {
  const value = subscription?.current_period_end || subscription?.subscription_expiry || userProfile?.subscription_expiry || null
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : null
}

function formatExpirationDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function getExpirationSummary(value: string | null, plan: string) {
  const days = getDaysRemaining(value)
  if (days === null) return plan === "trial" ? "7 jours" : getPlanLabel(plan)
  if (days < 0) return "Expire"
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return "1 jour"
  return `${days} jours`
}

function getDaysRemaining(value: string | null) {
  if (!value) return null
  const expiry = new Date(value)
  if (Number.isNaN(expiry.getTime())) return null
  const now = new Date()
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.ceil((expiryDay.getTime() - today.getTime()) / 86_400_000)
}

function expirationDateLabel(value: string) {
  return `${isExpiredDate(value) ? "Expire depuis le" : "Expire le"} ${formatExpirationDate(value)}`
}

function isExpiredDate(value: string | null) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

function ensureText(value: unknown) {
  return typeof value === "string" ? value : ""
}
