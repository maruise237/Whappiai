"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { AlertCircle, BellRing, CalendarClock, CheckCircle2, CreditCard, Gift, Info, Loader2, ShieldCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BillingPlans } from "@/components/dashboard/billing-plans"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { getPlanCode, getPlanLabel, PlanBadge } from "@/components/dashboard/plan-badge"
import { cn } from "@/lib/utils"
import { getManagedGroupUsage, getPlanGroupLimit, getPlanUsageMessage } from "@/lib/plan-usage"

export default function BillingPage() {
  const { t } = useTranslation("billing")
  const { getToken } = useAuth()
  const [activePlan, setActivePlan] = React.useState("trial")
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null)
  const [accessState, setAccessState] = React.useState({ allowed: true, status: "active", message: "" })
  const [isPlanLoading, setIsPlanLoading] = React.useState(true)
  const [managedGroupsUsed, setManagedGroupsUsed] = React.useState(0)
  const [paymentState, setPaymentState] = React.useState<{
    orderId: string
    status: "pending" | "completed" | "failed" | "cancelled" | "unknown"
    planCode?: string | null
    reference?: string | null
  } | null>(null)
  const recommendedPlan = getRecommendedPlan(activePlan, managedGroupsUsed)

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
      const nextPlan = resolveActivePlan(userProfile, subscription)
      setActivePlan(nextPlan)
      setExpiresAt(resolveExpiration(userProfile, subscription))
      setAccessState({
        allowed: subscription?.access_allowed !== false,
        status: ensureText(subscription?.status || userProfile?.plan_status || "active"),
        message: ensureText(subscription?.access_message || ""),
      })
      setManagedGroupsUsed(await getManagedGroupUsage(token || undefined))
    } catch {
      setActivePlan("trial")
      setExpiresAt(null)
      setManagedGroupsUsed(0)
      setAccessState({ allowed: false, status: "unknown", message: t("error_verify") })
    } finally {
      setIsPlanLoading(false)
    }
  }, [getToken, t])

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
    let interval: number | null = null
    let cancelled = false

    async function syncGeniusPayReturn() {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      if (params.get("payment") !== "geniuspay") return
      const orderId = params.get("order")
      if (!orderId) {
        await refreshPlan()
        return
      }

      setPaymentState({
        orderId,
        status: params.get("status") === "error" ? "failed" : "pending",
        planCode: params.get("plan"),
        reference: null,
      })

      const token = await getToken()
      const pollStatus = async () => {
        const payment = await api.payments.status(orderId, token || undefined)
        const normalizedStatus = normalizePaymentState(payment?.status)
        if (cancelled) return true

        setPaymentState({
          orderId,
          status: normalizedStatus,
          planCode: payment?.planCode || null,
          reference: payment?.reference || null,
        })

        if (normalizedStatus === "completed") {
          await refreshPlan()
          return true
        }

        if (normalizedStatus === "failed" || normalizedStatus === "cancelled") {
          return true
        }

        return false
      }

      const isDone = await pollStatus()
      if (isDone) return

      let attempts = 0
      interval = window.setInterval(async () => {
        attempts += 1
        const done = await pollStatus()
        if (done || attempts >= 24) {
          if (interval) window.clearInterval(interval)
        }
      }, 5000)
    }

    syncGeniusPayReturn()
    return () => {
      cancelled = true
      if (interval) window.clearInterval(interval)
    }
  }, [getToken, refreshPlan])

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <CreditCard className="h-5 w-5 text-primary" /> {t("page_title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("page_subtitle")}</p>
        </div>

        {isPlanLoading ? (
          <span className="h-auto rounded-full border px-4 py-1.5 text-[10px] font-semibold text-muted-foreground">
            {t("syncing_badge")}
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
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary">{isPlanLoading ? t("syncing_title") : billingBannerTitle(activePlan, accessState, t)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPlanLoading ? t("syncing_text") : billingBannerText(activePlan, accessState, t)}
              </p>
              {!isPlanLoading && expiresAt && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-medium">
                    <CalendarClock className={cn("h-3.5 w-3.5", isExpiredDate(expiresAt) ? "text-destructive" : "text-primary")} />
                    {expirationDateLabel(expiresAt, t)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-medium">
                    <BellRing className="h-3.5 w-3.5 text-amber-500" />
                    {t("reminder_badge")}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border bg-card px-4 py-3 text-left sm:text-right">
            <p className="text-xs text-muted-foreground">{isPlanLoading ? t("status_label") : t("expiration_label")}</p>
            <p className="text-lg font-bold text-primary">{isPlanLoading ? "..." : getExpirationSummary(expiresAt, activePlan, t)}</p>
            {!isPlanLoading && expiresAt && (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {accessState.allowed ? getPlanLabel(activePlan) : accessState.status}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {paymentState && (
        <Card className={cn(
          "shadow-none",
          paymentState.status === "completed"
            ? "border-primary/25 bg-primary/5"
            : paymentState.status === "failed" || paymentState.status === "cancelled"
              ? "border-destructive/25 bg-destructive/5"
              : "border-state-warning/30 bg-state-warning-light/35"
        )}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex gap-4">
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                paymentState.status === "completed"
                  ? "bg-primary/10 text-primary"
                  : paymentState.status === "failed" || paymentState.status === "cancelled"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-state-warning-light text-state-warning"
              )}>
                {paymentState.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : paymentState.status === "failed" || paymentState.status === "cancelled" ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {paymentState.status === "completed"
                    ? "Forfait active"
                    : paymentState.status === "failed" || paymentState.status === "cancelled"
                      ? "Confirmation interrompue"
                      : "Confirmation en cours"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paymentState.status === "completed"
                    ? "Votre abonnement est bien actif. Vous pouvez continuer normalement."
                    : paymentState.status === "failed" || paymentState.status === "cancelled"
                      ? "Nous n'avons pas encore pu finaliser l'activation. Si cela persiste, contactez le support avec votre reference de paiement."
                      : "Nous finalisons l'activation de votre forfait. Cela prend generalement quelques secondes et la page se met a jour automatiquement."}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border bg-card px-4 py-3 text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Suivi paiement</p>
              <p className="text-sm font-bold text-foreground">{paymentState.orderId.slice(0, 8)}...</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {paymentState.reference || paymentState.status}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isPlanLoading && (
        <Card className="border-primary/15 bg-card shadow-none">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Usage des groupes proteges</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {getPlanUsageMessage(activePlan, managedGroupsUsed)}
              </p>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3 text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Consommation actuelle</p>
              <p className="text-lg font-bold text-primary">
                {managedGroupsUsed}/{getPlanGroupLimit(activePlan)}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                groupes proteges
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <SalesProofCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Activation automatique"
          text="Apres paiement, Whappi suit la transaction et active le forfait des que GeniusPay confirme."
        />
        <SalesProofCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Forfaits verifiables"
          text="Chaque plan affiche seulement les fonctions livrables: groupes, moderation, IA et messages programmes."
        />
        <SalesProofCard
          icon={<Info className="h-4 w-4" />}
          title="Support avec reference"
          text="En cas de retard, gardez la reference de paiement: l'admin peut verifier la transaction."
        />
      </div>

      <div className="space-y-6">
        <div className="mb-6 space-y-2 text-center md:mb-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("plans_heading")}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {t("plans_subtitle")}
          </p>
        </div>

        <BillingPlans activePlan={activePlan} recommendedPlan={recommendedPlan} />
      </div>

      <Card className="mt-8 border-2 border-dashed bg-transparent md:mt-12">
        <CardContent className="flex flex-col items-center gap-4 p-5 md:flex-row md:gap-6 md:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1 text-center md:text-left">
            <h3 className="text-sm font-bold">{t("custom_title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("custom_text")}
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-full rounded-full md:w-auto">{t("custom_cta")}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SalesProofCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="border-primary/10 bg-card shadow-none">
      <CardContent className="flex gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function billingBannerTitle(plan: string, accessState: { allowed: boolean }, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!accessState.allowed) return t("banner_title_expired", { plan: getPlanLabel(plan) })
  if (plan === "trial") return t("banner_title_trial")
  return t("banner_title_active", { plan: getPlanLabel(plan) })
}

function billingBannerText(plan: string, accessState: { allowed: boolean; message: string }, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (!accessState.allowed) return accessState.message || t("banner_text_renew")
  if (plan === "starter") return "Inclus : jusqu'a 3 groupes, anti-liens, mots interdits, auto-exclusion et message de bienvenue manuel."
  if (plan === "pro") return "Inclus : jusqu'a 6 groupes, toute la moderation Starter et un vrai plus IA pour aider l'admin."
  if (plan === "business") return "Inclus : jusqu'a 16 groupes, tout le plan Pro IA et des fonctions plus avancees."
  return "Essai gratuit : 7 jours avec 1 groupe pour verifier la moderation et votre premiere regle activee."
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

function getExpirationSummary(value: string | null, plan: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const days = getDaysRemaining(value)
  if (days === null) return plan === "trial" ? t("expiration_7_days") : getPlanLabel(plan)
  if (days < 0) return t("expiration_expired")
  if (days === 0) return t("expiration_today")
  if (days === 1) return t("expiration_1_day")
  return t("expiration_days", { count: days })
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

function expirationDateLabel(value: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  return t(isExpiredDate(value) ? "expiration_since" : "expiration_on", { date: formatExpirationDate(value) })
}

function isExpiredDate(value: string | null) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

function ensureText(value: unknown) {
  return typeof value === "string" ? value : ""
}

function getRecommendedPlan(activePlan: string, managedGroupsUsed: number) {
  const plan = getPlanCode(activePlan)
  const limit = getPlanGroupLimit(plan)
  const usageRatio = limit > 0 ? managedGroupsUsed / limit : 0

  if (plan === "trial") return "starter"
  if (plan === "starter" && usageRatio >= 0.67) return "pro"
  if (plan === "pro" && usageRatio >= 0.67) return "business"
  return null
}

function normalizePaymentState(value: unknown): "pending" | "completed" | "failed" | "cancelled" | "unknown" {
  const status = ensureText(value).toLowerCase()
  if (status === "completed") return "completed"
  if (status === "failed") return "failed"
  if (status === "cancelled" || status === "canceled") return "cancelled"
  if (status === "pending" || status === "created" || status === "processing") return "pending"
  return "unknown"
}
