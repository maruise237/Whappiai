"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth, useUser } from "@clerk/clerk-react"
import { useTranslation } from "react-i18next"
import confetti from "canvas-confetti"
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  History,
  Inbox,
  Link2,
  MessageCircle,
  Plus,
  Radio,
  ShieldCheck,
  Smartphone,
  Wallet,
  TriangleAlert,
  Users,
  X,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

import { SessionCard } from "@/components/dashboard/session-card"
import { getPlanCode, getPlanLabel, PlanBadge } from "@/components/dashboard/plan-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { emitWappyEvent } from "@/lib/wappy-events"
import { shouldCelebrateSessionConnection } from "@/lib/session-celebration"
import { cn, ensureString, safeRender } from "@/lib/utils"
import { useWebSocket } from "@/providers/websocket-provider"

const DEFAULT_STATS_DAYS = 7
const RECENT_LOGS_COUNT = 6

type SessionItem = {
  sessionId?: string
  isConnected?: boolean
  status?: string
  qr?: string | null
  pairingCode?: string | null
  [key: string]: unknown
}

type ActivityItem = {
  id?: string | number
  action?: string
  resource_id?: string
  success?: boolean | number
  status?: string
  details?: unknown
  timestamp?: string
  created_at?: string
  [key: string]: unknown
}

type AdminStats = {
  users?: { total?: number; active?: number }
  sessions?: { total?: number; connected?: number }
  overview?: { activities?: number; successRate?: number; messagesSent?: number }
  operations?: { applied?: number; messagesSent?: number }
}

type AdminThreadSignal = {
  status?: string
  adminUnreadCount?: number
}

type AdminTransactionSignal = {
  status?: string
}

type AdminSignals = {
  openSupport: number
  unreadSupport: number
  pendingPayments: number
  failedPayments: number
  completedPayments: number
}

type AnalyticsPoint = {
  date?: string
  messages?: number
}

type ActivationState = {
  hasGroup: boolean
  hasActiveRule: boolean
  groupCount: number
  activeRuleGroups: number
}

type ActivationGroupPair = {
  sessionId: string
  groupId: string
  settings?: unknown
}

export default function DashboardPage() {
  const { t } = useTranslation("dashboard")
  const { isLoaded, user } = useUser()
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()
  const lastProcessedMessageRef = React.useRef("")
  const sessionSchema = React.useMemo(() => z.object({
    sessionId: z
      .string()
      .min(3, t("session_name_min_error"))
      .regex(/^[a-z0-9-]+$/, t("session_name_format_error")),
    phoneNumber: z.string().optional(),
  }), [t])

  const [sessions, setSessions] = React.useState<SessionItem[]>([])
  const sessionsRef = React.useRef<SessionItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [summary, setSummary] = React.useState({
    totalActivities: 0,
    successRate: 0,
    activeSessions: 0,
    messagesSent: 0,
  })
  const [adminStats, setAdminStats] = React.useState<AdminStats | null>(null)
  const [adminSignals, setAdminSignals] = React.useState<AdminSignals>({
    openSupport: 0,
    unreadSupport: 0,
    pendingPayments: 0,
    failedPayments: 0,
    completedPayments: 0,
  })
  const [recentActivities, setRecentActivities] = React.useState<ActivityItem[]>([])
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsPoint[]>([])
  const [showCenterBadge, setShowCenterBadge] = React.useState(false)
  const [activePlan, setActivePlan] = React.useState("trial")
  const [trialExpiry, setTrialExpiry] = React.useState<string | null>(null)
  const [accessAllowed, setAccessAllowed] = React.useState(true)
  const [activationState, setActivationState] = React.useState<ActivationState>({
    hasGroup: false,
    hasActiveRule: false,
    groupCount: 0,
    activeRuleGroups: 0,
  })

  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const isAdmin = userEmail === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

  React.useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { sessionId: "", phoneNumber: "" },
  })

  const fetchAdminSummary = React.useCallback(async (token: string) => {
    try {
      const [stats, analytics] = await Promise.all([
        api.admin.getStats(DEFAULT_STATS_DAYS, token),
        api.activities.analytics(DEFAULT_STATS_DAYS, token),
      ])
      const safeStats = stats as AdminStats
      setAdminStats(safeStats)
      setAnalyticsData(Array.isArray(analytics) ? (analytics as AnalyticsPoint[]) : [])
      setSummary({
        totalActivities: safeStats?.overview?.activities || 0,
        successRate: safeStats?.overview?.successRate || 0,
        messagesSent: safeStats?.overview?.messagesSent || 0,
        activeSessions: safeStats?.sessions?.connected || 0,
      })

      const [supportThreadsResult, transactionsResult] = await Promise.allSettled([
        api.support.adminListThreads({}, token),
        api.support.adminListTransactions({}, token),
      ])

      const supportThreads = supportThreadsResult.status === "fulfilled" ? supportThreadsResult.value : []
      const transactions = transactionsResult.status === "fulfilled" ? transactionsResult.value : []
      const safeThreads = Array.isArray(supportThreads) ? (supportThreads as AdminThreadSignal[]) : []
      const safeTransactions = Array.isArray(transactions) ? (transactions as AdminTransactionSignal[]) : []

      setAdminSignals({
        openSupport: safeThreads.filter(item => item.status === "open" || item.status === "pending").length,
        unreadSupport: safeThreads.reduce((sum, item) => sum + Number(item.adminUnreadCount || 0), 0),
        pendingPayments: safeTransactions.filter(item => item.status === "pending" || item.status === "created").length,
        failedPayments: safeTransactions.filter(item => item.status === "failed").length,
        completedPayments: safeTransactions.filter(item => item.status === "completed").length,
      })
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchUserSummary = React.useCallback(async (token: string, currentSessions: SessionItem[]) => {
    try {
      const summ = await api.activities.summary(DEFAULT_STATS_DAYS, token)
      setSummary({
        totalActivities: summ?.totalActivities || 0,
        successRate: summ?.successRate || 0,
        messagesSent: summ?.byAction?.send_message || 0,
        activeSessions: currentSessions.filter(s => s.isConnected).length,
      })
    } catch (error) {
      console.error(error)
    }
  }, [])

  const fetchSummaryData = React.useCallback(async (currentSessions: SessionItem[]) => {
    try {
      const token = await getToken()
      if (!token) return

      const [profileResult, subscriptionResult] = await Promise.allSettled([
        api.auth.check(token),
        api.subscriptions.current(token),
      ])
      const profile = profileResult.status === "fulfilled" ? profileResult.value : null
      const subscription = subscriptionResult.status === "fulfilled" ? subscriptionResult.value : null
      const userProfile = profile?.user || profile
      setActivePlan(getPlanCode(
        subscription?.plan_code ||
        subscription?.plan_id ||
        userProfile?.plan_id ||
        userProfile?.plan ||
        userProfile?.subscription_plan ||
        "trial"
      ))
      setTrialExpiry(resolveExpiry(subscription?.current_period_end || subscription?.subscription_expiry || userProfile?.subscription_expiry))
      setAccessAllowed(subscription?.access_allowed !== false)

      if (isAdmin) {
        await fetchAdminSummary(token)
      } else {
        await fetchUserSummary(token, currentSessions)
      }

      const activityList = await api.activities.list(RECENT_LOGS_COUNT, 0, token)
      setRecentActivities(Array.isArray(activityList) ? (activityList as ActivityItem[]) : [])
    } catch (error) {
      console.error(error)
    }
  }, [fetchAdminSummary, fetchUserSummary, getToken, isAdmin])

  const fetchActivationState = React.useCallback(async (token: string, currentSessions: SessionItem[]) => {
    const connected = currentSessions.filter(session => session.isConnected || session.status === "CONNECTED")
    if (connected.length === 0) {
      setActivationState({ hasGroup: false, hasActiveRule: false, groupCount: 0, activeRuleGroups: 0 })
      return
    }

    try {
      const groupResults = await Promise.allSettled(
        connected.map(async session => {
          const sessionId = ensureString(session.sessionId)
          const groups = await api.sessions.getGroups(sessionId, token)
          return {
            sessionId,
            groups: Array.isArray(groups) ? groups : [],
          }
        })
      )

      const groupPairs: ActivationGroupPair[] = groupResults.flatMap(result => {
        if (result.status !== "fulfilled") return []
        return result.value.groups.map((group: { id?: unknown; jid?: unknown; settings?: unknown }) => ({
          sessionId: result.value.sessionId,
          groupId: ensureString(group.id || group.jid),
          settings: group.settings,
        })).filter((item: ActivationGroupPair) => item.groupId)
      })

      if (groupPairs.length === 0) {
        setActivationState({ hasGroup: false, hasActiveRule: false, groupCount: 0, activeRuleGroups: 0 })
        return
      }

      const settingsResults = await Promise.allSettled(
        groupPairs.slice(0, 20).map(async pair => {
          try {
            return await api.sessions.getGroupSettings(pair.sessionId, pair.groupId, token)
          } catch {
            return pair.settings || null
          }
        })
      )

      const activeRuleGroups = settingsResults.filter(
        result => result.status === "fulfilled" && hasActiveModerationRule(result.value)
      ).length

      setActivationState({
        hasGroup: true,
        hasActiveRule: activeRuleGroups > 0,
        groupCount: groupPairs.length,
        activeRuleGroups,
      })
    } catch (error) {
      console.error(error)
      setActivationState(prev => ({ ...prev, hasGroup: false, hasActiveRule: false, groupCount: 0, activeRuleGroups: 0 }))
    }
  }, [])

  const fetchSessions = React.useCallback(async (autoSelect = false) => {
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      const sessionsList = Array.isArray(data) ? (data as SessionItem[]) : []
      setSessions(sessionsList)

      if (autoSelect && sessionsList.length > 0) {
        setSelectedSessionId(prev => prev || ensureString(sessionsList[0].sessionId))
      }

      fetchSummaryData(sessionsList)
      if (token) fetchActivationState(token, sessionsList)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [fetchActivationState, fetchSummaryData, getToken])

  React.useEffect(() => {
    if (isLoaded && user) {
      fetchSessions(true)
    }
  }, [fetchSessions, isLoaded, user])

  React.useEffect(() => {
    setShowCenterBadge(localStorage.getItem("whappi-center-badge-dismissed") !== "1")
  }, [])

  const dismissCenterBadge = () => {
    localStorage.setItem("whappi-center-badge-dismissed", "1")
    setShowCenterBadge(false)
  }

  React.useEffect(() => {
    if (!lastMessage) return
    const messageStr = JSON.stringify(lastMessage)
    if (messageStr === lastProcessedMessageRef.current) return
    lastProcessedMessageRef.current = messageStr

    if (lastMessage.type === "session-update") {
      const updates = Array.isArray(lastMessage.data) ? lastMessage.data : [lastMessage.data]
      let needsRefresh = false
      const previousSessions = sessionsRef.current
      const celebratedSessions = updates
        .filter((update: SessionItem) => {
          if (!update?.sessionId) return false
          const previous = previousSessions.find(s => ensureString(s.sessionId) === ensureString(update.sessionId))
          return shouldCelebrateSessionConnection(previous, update)
        })
        .map((update: SessionItem) => ensureString(update.sessionId))

      setSessions(prev => {
        const next = [...prev]
        let hasChanges = false

        updates.forEach((update: SessionItem) => {
          if (!update?.sessionId) return
          const index = next.findIndex(s => ensureString(s.sessionId) === ensureString(update.sessionId))
          if (index !== -1) {
            next[index] = {
              ...next[index],
              ...update,
              isConnected: update.status === "CONNECTED",
            }
            hasChanges = true
          } else {
            needsRefresh = true
          }
        })

        return hasChanges ? next : prev
      })

      if (needsRefresh) fetchSessions(false)

      celebratedSessions.forEach(sessionId => {
        toast.success(`${t("welcome")} — ${sessionId}`)
        confetti()
      })

      updates.forEach((update: SessionItem) => {
        if (!update) return
        if (update.status === "GENERATING_CODE" && update.pairingCode) {
          toast.info(`${t("session_pairing_received") || "Code d'appairage reçu"} pour ${update.sessionId}`)
        }
      })

    }

    if (lastMessage.type === "session-deleted") {
      const sessionId = lastMessage.data?.sessionId
      if (sessionId) {
        setSessions(prev => prev.filter(s => ensureString(s.sessionId) !== ensureString(sessionId)))
        if (ensureString(selectedSessionId) === ensureString(sessionId)) {
          setSelectedSessionId(null)
        }
      }
    }
  }, [fetchSessions, lastMessage, selectedSessionId, t])

  const selectedSession = sessions.find(s => ensureString(s.sessionId) === ensureString(selectedSessionId))
  const onboarding = React.useMemo(() => onboardingSteps({
    sessionCount: sessions.length,
    activeSessions: summary.activeSessions,
    hasGroup: activationState.hasGroup,
    hasActiveRule: activationState.hasActiveRule,
    activityCount: Math.max(summary.totalActivities, recentActivities.length),
    t,
  }), [activationState.hasActiveRule, activationState.hasGroup, recentActivities.length, sessions.length, summary.activeSessions, summary.totalActivities, t])
  const onboardingDone = onboarding.filter(step => step.state === "done").length

  if (!isLoaded || loading) {
    return (
      <div className="grid min-h-[70dvh] place-items-center text-zinc-500">
        {t("loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {isAdmin ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden rounded-[28px] border-primary/10 bg-card shadow-[0_30px_80px_-55px_hsl(var(--primary))]">
              <CardContent className="space-y-6 p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Badge className="border-primary/15 bg-primary/10 text-primary hover:bg-primary/10">
                      Espace admin dedie
                    </Badge>
                    <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      Supervisez Whappi sans bruit compte client.
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Cette vue ne montre que les zones admin: support, paiements, utilisateurs, maintenance et IA.
                    </p>
                  </div>
                  <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                    <Button asChild className="h-10 rounded-xl">
                      <Link href="/dashboard/support-inbox">Ouvrir le support</Link>
                    </Button>
                    <Button asChild variant="outline" className="h-10 rounded-xl">
                      <Link href="/dashboard/users">Voir les comptes</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminZoneCard
                    href="/dashboard/support-inbox"
                    icon={<Inbox className="h-4 w-4" />}
                    title="Support & paiements"
                    text="Conversation client, transactions et suivis sensibles."
                  />
                  <AdminZoneCard
                    href="/dashboard/users"
                    icon={<Users className="h-4 w-4" />}
                    title="Comptes"
                    text="Forfaits, activations manuelles et vue utilisateur."
                  />
                  <AdminZoneCard
                    href="/dashboard/ai-models"
                    icon={<Smartphone className="h-4 w-4" />}
                    title="Modeles IA"
                    text="Providers, cles API et configuration technique."
                  />
                  <AdminZoneCard
                    href="/dashboard/maintenance"
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="Maintenance"
                    text="Mode maintenance et controles systeme reserves admin."
                  />
                </div>
              </CardContent>
            </Card>

            <AdminControlRail adminStats={adminStats} adminSignals={adminSignals} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <AdminPanel adminStats={adminStats} adminSignals={adminSignals} analyticsData={analyticsData} recentActivities={recentActivities} />
            <AdminFocusPanel adminSignals={adminSignals} adminStats={adminStats} />
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="overflow-hidden rounded-[28px] border bg-card shadow-[0_30px_80px_-55px_hsl(var(--primary))]">
              <div className="border-b p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    {showCenterBadge && (
                      <Badge className="gap-2 border-primary/15 bg-primary/10 pr-1 text-primary hover:bg-primary/10">
                        {t("hero_badge_new")}
                        <button
                          type="button"
                          onClick={dismissCenterBadge}
                          className="rounded-full p-0.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
                          aria-label={t("hero_badge_hide")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {t("hero_title")}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {t("hero_desc")}
                    </p>
                  </div>
                  <Button onClick={() => setIsCreateOpen(true)} className="h-10 w-full rounded-xl sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("new_session")}
                  </Button>
                </div>
              </div>

              <div className="grid gap-px bg-border md:grid-cols-3">
                <MetricTile label={t("stat_sessions")} value={sessions.length} sub={`${summary.activeSessions} ${t("stat_connected")}`} />
                <MetricTile label={t("stat_messages")} value={summary.messagesSent} sub={t("stat_volume")} />
                <MetricTile label={t("stat_actions")} value={summary.totalActivities} sub={t("stat_recent")} />
              </div>
            </div>

            <Card className="rounded-[28px] bg-card shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold truncate">{t("onboarding_title")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("onboarding_desc")}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{onboardingDone}/4 {t("onboarding_steps")}</Badge>
                </div>
                <Progress value={(onboardingDone / 4) * 100} className="mt-4 h-1.5" />
                <div className="mt-5 space-y-3">
                  {onboarding.map(step => (
                    <div key={step.title} className={cn(
                      "flex gap-3 rounded-2xl border bg-background/60 p-3 transition-colors",
                      step.state === "done" && "opacity-60",
                      step.state === "current" && "border-state-warning bg-state-warning-light/40"
                    )}>
                      <span className={cn(
                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                        step.state === "done" && "bg-primary/10 text-primary",
                        step.state === "current" && "animate-pulse bg-state-warning text-white",
                        step.state === "upcoming" && "bg-muted text-muted-foreground"
                      )}>
                        {step.state === "done" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : step.state === "current" ? (
                          <Radio className="h-3.5 w-3.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div>
                        <p className={cn("text-sm font-medium", step.state === "done" && "line-through")}>{step.title}</p>
                        <p className={cn("text-xs text-muted-foreground", step.state === "upcoming" && "text-muted-foreground/60")}>{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {sessions.length === 0 && (
            <FirstRunPanel onCreate={() => setIsCreateOpen(true)} />
          )}

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <TrialFocusPanel
              plan={activePlan}
              expiry={trialExpiry}
              accessAllowed={accessAllowed}
              sessionCount={sessions.length}
              hasGroup={activationState.hasGroup}
              hasActiveRule={activationState.hasActiveRule}
            />
            <PlanCapacityPanel
              plan={activePlan}
              accessAllowed={accessAllowed}
              sessionCount={sessions.length}
              groupCount={activationState.groupCount}
              activeRuleGroups={activationState.activeRuleGroups}
            />
          </div>

          <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="rounded-[28px] bg-card shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold truncate">{t("session_work_title")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("session_work_desc")}</p>
                  </div>
                  <Select value={selectedSessionId || ""} onValueChange={value => setSelectedSessionId(ensureString(value))}>
                    <SelectTrigger className="h-10 text-xs md:w-[220px]">
                      <SelectValue placeholder={t("choose_session")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map(session => (
                        <SelectItem key={ensureString(session.sessionId)} value={ensureString(session.sessionId)} className="text-xs">
                          {safeRender(session.sessionId)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-5">
                  <SessionCard session={selectedSession} onRefresh={() => fetchSessions(false)} onCreate={() => setIsCreateOpen(true)} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] bg-card shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold truncate">{t("rules_title")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t("rules_desc")}</p>
                  </div>
                  <Button asChild variant="outline" className="h-9 text-xs">
                    <Link href="/dashboard/moderation">
                      {t("rules_open")}
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>

                <div className="grid gap-3">
                  <RuleRow icon={<Link2 className="h-4 w-4" />} title={t("rule_anti_links")} text={t("rule_anti_links_desc")} />
                  <RuleRow icon={<MessageCircle className="h-4 w-4" />} title={t("rule_welcome")} text={t("rule_welcome_desc")} />
                  <RuleRow icon={<ShieldCheck className="h-4 w-4" />} title={t("rule_warnings")} text={t("rule_warnings_desc")} />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <UserActivityPanel recentActivities={recentActivities} />
            <NextBestActionPanel
              sessionCount={sessions.length}
              activeSessions={summary.activeSessions}
              hasGroup={activationState.hasGroup}
              hasActiveRule={activationState.hasActiveRule}
            />
          </section>
        </>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async (value: z.infer<typeof sessionSchema>) => {
                const toastId = toast.loading(t("session_creating"))
                try {
                  const token = await getToken()
                  await api.sessions.create(value.sessionId, value.phoneNumber, token || undefined)
                  toast.success(t("session_ready"), { id: toastId })
                  emitWappyEvent({
                    type: "session",
                    action: "created",
                    sessionId: value.sessionId,
                    status: "connecting",
                  })
                  setIsCreateOpen(false)
                  fetchSessions(true)
                } catch (error) {
                  const message = error instanceof Error ? error.message : t("session_error")
                  toast.error(message, { id: toastId })
                  emitWappyEvent({
                    type: "system",
                    action: "error",
                    sessionId: value.sessionId,
                    errorType: "session-create-failed",
                  })
                }
              })}
              className="space-y-6"
            >
              <DialogHeader>
                <DialogTitle>{t("new_session_title")}</DialogTitle>
                <DialogDescription>
                  {t("create_dialog_desc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_dialog_id_label")}</FormLabel>
                      <FormControl>
                        <Input autoFocus placeholder={t("create_dialog_id_placeholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("create_dialog_phone_label")}</FormLabel>
                      <FormControl>
                        <Input type="tel" inputMode="numeric" autoComplete="tel" placeholder={t("create_dialog_phone_placeholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  {t("create_dialog_submit")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TrialFocusPanel({
  plan,
  expiry,
  accessAllowed,
  sessionCount,
  hasGroup,
  hasActiveRule,
}: {
  plan: string
  expiry: string | null
  accessAllowed: boolean
  sessionCount: number
  hasGroup: boolean
  hasActiveRule: boolean
}) {
  const isTrial = getPlanCode(plan) === "trial"
  const title = !accessAllowed
    ? "Votre acces doit etre relance"
    : isTrial
      ? "Votre essai gratuit est actif"
      : `Whappi est pret pour votre plan ${getPlanLabel(plan)}`

  const text = !accessAllowed
    ? "L'essai ou l'abonnement n'autorise plus de nouvelles actions. Choisissez un plan pour relancer vos groupes et vos automatisations."
    : isTrial
      ? "Vous avez 7 jours pour connecter 1 groupe, promouvoir votre numero admin et activer au moins une regle de moderation. L'objectif est simple: voir Whappi moderer un vrai groupe."
      : "Continuez l'activation: connectez vos groupes prioritaires, activez vos regles essentielles puis montez en puissance."

  const checklist = [
    { done: sessionCount > 0, label: "Session connectee" },
    { done: hasGroup, label: "Premier groupe repere" },
    { done: hasActiveRule, label: "Premiere regle activee" },
  ]

  return (
    <Card
      className={cn(
        "rounded-[28px] border shadow-none",
        !accessAllowed
          ? "border-destructive/25 bg-destructive/5"
          : isTrial
            ? "border-state-warning/30 bg-state-warning-light/35"
            : "border-primary/20 bg-primary/5"
      )}
    >
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlanBadge plan={plan} active className="rounded-full px-3 py-1" />
            {expiry && (
              <Badge variant="outline" className="rounded-full bg-background/80">
                {`Echeance: ${formatShortDate(expiry)}`}
              </Badge>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{text}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {checklist.map((item) => (
              <Badge
                key={item.label}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  item.done
                    ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
                    : "border-border bg-background text-muted-foreground hover:bg-background"
                )}
              >
                {item.done ? "OK" : "A faire"} {item.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col">
          <Button asChild className="w-full rounded-xl lg:w-auto">
            <Link href={hasGroup ? "/dashboard/moderation" : "/dashboard"}>
              {hasGroup ? "Activer mes regles" : "Connecter une session"}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-xl lg:w-auto">
            <Link href="/dashboard/billing">
              {isTrial || !accessAllowed ? "Voir les plans" : "Gerer mon plan"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PlanCapacityPanel({
  plan,
  accessAllowed,
  sessionCount,
  groupCount,
  activeRuleGroups,
}: {
  plan: string
  accessAllowed: boolean
  sessionCount: number
  groupCount: number
  activeRuleGroups: number
}) {
  const normalizedPlan = getPlanCode(plan)
  const sessionLimit = accessAllowed ? getPlanSessionLimit(normalizedPlan) : 0
  const usageRatio = sessionLimit > 0 ? Math.min((sessionCount / sessionLimit) * 100, 100) : 0
  const isNearLimit = sessionLimit > 0 && sessionCount >= Math.max(sessionLimit - 1, 1)
  const upgradeLabel = normalizedPlan === "business" ? "Plan le plus complet actif" : "Passer au plan superieur"

  return (
    <Card className="rounded-[28px] bg-card shadow-none">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PlanBadge plan={plan} active className="rounded-full px-3 py-1" />
              {!accessAllowed && (
                <Badge variant="outline" className="rounded-full border-destructive/30 text-destructive">
                  Acces bloque
                </Badge>
              )}
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">Capacite du plan</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Suivez ce qui est deja actif dans votre espace et voyez quand il devient utile de passer au niveau superieur.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full rounded-xl text-xs sm:w-auto">
            <Link href="/dashboard/billing">{upgradeLabel}</Link>
          </Button>
        </div>

        <div className="space-y-3 rounded-2xl border bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Sessions utilisees</p>
              <p className="text-xs text-muted-foreground">
                {sessionLimit > 0
                  ? `${sessionCount} sur ${sessionLimit} incluses dans ce plan`
                  : "Activez un plan pour relancer la creation de sessions"}
              </p>
            </div>
            <Badge className={cn(
              "self-start rounded-full border px-3 py-1 text-[10px] font-semibold sm:self-auto",
              isNearLimit
                ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50"
                : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
            )}>
              {sessionLimit > 0 ? `${Math.max(sessionLimit - sessionCount, 0)} restante(s)` : "0 restante"}
            </Badge>
          </div>
          <Progress value={usageRatio} className="h-2" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <UsagePill label="Plan actif" value={getPlanLabel(plan)} sub={accessAllowed ? "Operationnel" : "A relancer"} />
          <UsagePill label="Groupes detectes" value={groupCount} sub={groupCount > 0 ? "Trouves sur vos sessions" : "Aucun groupe charge"} />
          <UsagePill label="Regles actives" value={activeRuleGroups} sub={activeRuleGroups > 0 ? "Groupes proteges" : "Encore a activer"} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full rounded-xl sm:w-auto">
            <Link href="/dashboard/moderation">Configurer mes groupes</Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
            <Link href="/dashboard/billing">{isNearLimit || !accessAllowed ? "Voir les upgrades" : "Voir mon abonnement"}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function resolveExpiry(value: unknown) {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : null
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })
}

function getPlanSessionLimit(plan: string) {
  const quotas: Record<string, number> = {
    trial: 1,
    starter: 3,
    pro: 6,
    business: 16,
  }
  return quotas[getPlanCode(plan)] ?? 1
}

function MetricTile({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-card p-5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{safeRender(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function UsagePill({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function RuleRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-background/60 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

function FirstRunPanel({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation("dashboard")
  return (
    <Card className="rounded-[28px] border-primary/30 bg-primary/10 shadow-none">
      <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">{t("first_run_title")}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("first_run_heading")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("first_run_desc")}
          </p>
        </div>
        <Button onClick={onCreate} className="h-11 w-full rounded-xl lg:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t("first_run_cta")}
        </Button>
      </CardContent>
    </Card>
  )
}

function UserActivityPanel({ recentActivities }: { recentActivities: ActivityItem[] }) {
  const { t } = useTranslation("dashboard")
  return (
    <Card className="rounded-xl border bg-card shadow-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold truncate">{t("last_actions")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("activity_limit")}</p>
          </div>
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
        <ActivityTable recentActivities={recentActivities} emptyText={t("no_activity")} />
      </CardContent>
    </Card>
  )
}

function AdminPanel({
  adminStats,
  adminSignals,
  analyticsData,
  recentActivities,
}: {
  adminStats: AdminStats | null
  adminSignals: AdminSignals
  analyticsData: AnalyticsPoint[]
  recentActivities: ActivityItem[]
}) {
  const { t } = useTranslation("dashboard")
  const primaryAdminAction = adminSignals.unreadSupport > 0
    ? {
        title: "Repondre aux clients en attente",
        text: `${adminSignals.unreadSupport} message${adminSignals.unreadSupport > 1 ? "s" : ""} support attendent une reponse admin.`,
        href: "/dashboard/support-inbox",
        cta: "Ouvrir la boite support",
      }
    : adminSignals.failedPayments > 0
      ? {
          title: "Verifier les paiements en echec",
          text: `${adminSignals.failedPayments} transaction${adminSignals.failedPayments > 1 ? "s" : ""} demandent une verification.`,
          href: "/dashboard/support-inbox",
          cta: "Voir les transactions",
        }
      : {
          title: "Surveiller les comptes a accompagner",
          text: "Le centre admin est propre. Utilisez la vue utilisateurs pour traiter les exceptions et les upgrades manuels.",
          href: "/dashboard/users",
          cta: "Ouvrir les utilisateurs",
        }

  return (
    <Card className="rounded-[28px] border-primary/10 bg-card shadow-none">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 rounded-[24px] border border-primary/15 bg-primary/5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">Poste de commandement admin</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Commencez par l'action la plus rentable maintenant.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Les meilleurs dashboards admin montrent d'abord les exceptions, ensuite les raccourcis, et seulement apres les courbes.
              </p>
            </div>
            <Button asChild className="h-10 w-full lg:w-auto">
              <Link href={primaryAdminAction.href}>{primaryAdminAction.cta}</Link>
            </Button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border bg-background/60 p-4">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Action prioritaire</p>
              <p className="mt-2 text-lg font-semibold">{primaryAdminAction.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{primaryAdminAction.text}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <QuickAction href="/dashboard/support-inbox" icon={<Inbox className="h-4 w-4" />} title="Support" text={`${adminSignals.openSupport} conversations ouvertes`} />
              <QuickAction href="/dashboard/users" icon={<Users className="h-4 w-4" />} title="Comptes" text={`${adminStats?.users?.total || 0} utilisateurs`} />
              <QuickAction href="/dashboard/support-inbox" icon={<Wallet className="h-4 w-4" />} title="Paiements" text={`${adminSignals.pendingPayments + adminSignals.failedPayments} a verifier`} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <MiniAdminStat icon={<Inbox className="h-4 w-4" />} label="Messages non lus" value={adminSignals.unreadSupport} />
            <MiniAdminStat icon={<Wallet className="h-4 w-4" />} label="Paiements en attente" value={adminSignals.pendingPayments} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MiniAdminStat icon={<Users className="h-4 w-4" />} label="Utilisateurs actifs" value={adminStats?.users?.active || 0} />
          <MiniAdminStat icon={<Smartphone className="h-4 w-4" />} label="Sessions connectees" value={adminStats?.sessions?.connected || 0} />
          <MiniAdminStat icon={<ShieldCheck className="h-4 w-4" />} label="Paiements completes" value={adminSignals.completedPayments} />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border bg-background/60 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Tendance operations</p>
              <p className="mt-1 text-xs text-muted-foreground">Courbe secondaire utile pour lire le rythme, pas pour decider de la prochaine action.</p>
            </div>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="adminMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#adminMessages)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border bg-background/60 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Journal recent</p>
              <p className="mt-1 text-xs text-muted-foreground">Vue courte pour valider le systeme sans ouvrir une page plus lourde.</p>
            </div>
            <ActivityTable recentActivities={recentActivities.slice(0, 3)} emptyText={t("admin_no_activity")} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminZoneCard({
  href,
  icon,
  title,
  text,
}: {
  href: string
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border bg-background/60 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </Link>
  )
}

function AdminControlRail({
  adminStats,
  adminSignals,
}: {
  adminStats: AdminStats | null
  adminSignals: AdminSignals
}) {
  const items = [
    {
      label: "Messages non lus",
      value: adminSignals.unreadSupport,
      note: "Demandent une reponse admin.",
    },
    {
      label: "Paiements a verifier",
      value: adminSignals.pendingPayments + adminSignals.failedPayments,
      note: "Attente, echec ou verification manuelle.",
    },
    {
      label: "Utilisateurs actifs",
      value: adminStats?.users?.active || 0,
      note: "Comptes operationnels actuellement.",
    },
    {
      label: "Sessions connectees",
      value: adminStats?.sessions?.connected || 0,
      note: "Lignes WhatsApp encore en ligne.",
    },
  ]

  return (
    <Card className="rounded-[28px] bg-card shadow-none">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold">Surveillance admin</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vue courte reservee au pilotage interne, sans sessions ni onboarding client.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {items.map(item => (
            <div key={item.label} className="rounded-2xl border bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">Acces rapides admin</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild className="justify-between rounded-xl">
              <Link href="/dashboard/support-inbox">
                Support & transactions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between rounded-xl">
              <Link href="/dashboard/users">
                Comptes et forfaits
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminFocusPanel({
  adminSignals,
  adminStats,
}: {
  adminSignals: AdminSignals
  adminStats: AdminStats | null
}) {
  const focusItems = [
    {
      label: "Support ouvert",
      status: adminSignals.openSupport > 0 ? "A traiter" : "Stable",
      tone: adminSignals.openSupport > 0 ? "bg-state-warning/10 text-state-warning" : "bg-primary/10 text-primary",
      note: `${adminSignals.openSupport} conversation(s) encore ouverte(s).`,
    },
    {
      label: "Flux paiement",
      status: adminSignals.pendingPayments > 0 || adminSignals.failedPayments > 0 ? "Verifier" : "Sain",
      tone: adminSignals.pendingPayments > 0 || adminSignals.failedPayments > 0 ? "bg-state-warning/10 text-state-warning" : "bg-primary/10 text-primary",
      note: `${adminSignals.completedPayments} paiement(s) completes, ${adminSignals.pendingPayments + adminSignals.failedPayments} a suivre.`,
    },
    {
      label: "Base comptes",
      status: (adminStats?.users?.total || 0) > 0 ? "Active" : "Vide",
      tone: (adminStats?.users?.total || 0) > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      note: `${adminStats?.users?.total || 0} compte(s) connus dans l'espace SaaS.`,
    },
  ]

  return (
    <Card className="rounded-[28px] bg-card shadow-none">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-sm font-semibold">Controle rapide</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Resume lateral reserve a la supervision interne de Whappi.
          </p>
        </div>

        <div className="space-y-3">
          {focusItems.map(item => (
            <div key={item.label} className="rounded-2xl border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{item.label}</p>
                <Badge className={cn("border-none", item.tone)}>{item.status}</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border bg-background/60 p-4">
          <p className="text-sm font-semibold">Zones reservees admin</p>
          <div className="mt-3 grid gap-2">
            <QuickAction href="/dashboard/ai-models" icon={<Smartphone className="h-4 w-4" />} title="Modeles IA" text="Configurer providers et cles API." />
            <QuickAction href="/dashboard/maintenance" icon={<ShieldCheck className="h-4 w-4" />} title="Maintenance" text="Garder le dashboard propre en production." />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NextBestActionPanel({
  sessionCount,
  activeSessions,
  hasGroup,
  hasActiveRule,
}: {
  sessionCount: number
  activeSessions: number
  hasGroup: boolean
  hasActiveRule: boolean
}) {
  const { t } = useTranslation("dashboard")
  const steps = [
    { label: t("step_session"), done: sessionCount > 0 },
    { label: t("step_connexion"), done: activeSessions > 0 },
    { label: t("step_groupe"), done: activeSessions > 0 && hasGroup },
    { label: t("step_regle"), done: hasActiveRule },
  ]

  const hasTodo = steps.some(step => !step.done)

  return (
    <Card className="bg-card shadow-none">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold truncate">{t("next_action_title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("next_action_desc")}</p>
        </div>
        <div className="space-y-3">
          {steps.map(step => (
            <div key={step.label} className="flex items-center justify-between rounded-2xl border bg-background/60 p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                {!step.done && <TriangleAlert className="h-3.5 w-3.5 text-state-warning" />}
                {step.label}
              </span>
              <Badge className={cn(step.done ? "bg-primary/10 text-primary" : "bg-state-warning/10 text-state-warning", "text-[10px] sm:text-xs px-2 py-0.5")}>
                {step.done ? t("next_action_ok") : t("next_action_todo")}
              </Badge>
            </div>
          ))}
        </div>
        <Button asChild className={cn("mt-5 w-full", hasTodo && "bg-state-warning text-white hover:bg-state-warning/90")} size="sm">
          <Link href="/dashboard/moderation">{t("next_action_cta")}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function MiniAdminStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-background/60 p-4">
      <div className="mb-3 text-primary">{icon}</div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function QuickAction({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-2xl border bg-card/70 p-3 transition-colors hover:bg-muted/40">
      <div className="mb-2 text-primary">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </Link>
  )
}

function ActivityTable({ recentActivities, emptyText }: { recentActivities: ActivityItem[]; emptyText: string }) {
  const { t, i18n } = useTranslation("dashboard")
  if (recentActivities.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
        {emptyText}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[10px]">{t("table_time")}</TableHead>
            <TableHead className="text-[10px]">{t("table_type")}</TableHead>
            <TableHead className="text-[10px]">{t("table_group")}</TableHead>
            <TableHead className="text-[10px]">{t("table_preview")}</TableHead>
            <TableHead className="text-[10px]">{t("table_status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentActivities.slice(0, 6).map(activity => (
            <TableRow key={ensureString(activity.id || activity.timestamp || activity.created_at)} className="hover:bg-surface-neutral">
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{activityTime(activity, i18n.language)}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{activityType(activity, t)}</Badge></TableCell>
              <TableCell className="max-w-28 truncate text-xs">{safeRender(activity.resource_id || t("session_fallback"))}</TableCell>
              <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                <span className="block truncate" title={activityPreview(activity)}>
                  {activityPreview(activity)}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={cn(
                  "border-none text-[10px]",
                  activity.success === 1 || activity.success === true || activity.status === "success"
                    ? "bg-primary/10 text-primary hover:bg-primary/10"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/10"
                )}>
                  {activity.success === 1 || activity.success === true || activity.status === "success" ? t("table_ok") : t("table_error")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function onboardingSteps(opts: {
  sessionCount: number
  activeSessions: number
  hasGroup: boolean
  hasActiveRule: boolean
  activityCount: number
  t: (key: string) => string
}) {
  const { sessionCount, activeSessions, hasGroup, hasActiveRule, activityCount, t } = opts
  const base = [
    { title: t("onb_step1_title"), text: t("onb_step1_text"), done: sessionCount > 0 },
    { title: t("onb_step2_title"), text: t("onb_step2_text"), done: activeSessions > 0 && hasGroup },
    { title: t("onb_step3_title"), text: t("onb_step3_text"), done: hasActiveRule },
    { title: t("onb_step4_title"), text: t("onb_step4_text"), done: activityCount > 0 },
  ]
  const currentIndex = base.findIndex(step => !step.done)
  return base.map((step, index) => ({
    ...step,
    state: step.done ? "done" : index === currentIndex ? "current" : "upcoming",
  }))
}

function hasActiveModerationRule(settings: unknown) {
  if (!settings || typeof settings !== "object") return false
  const item = settings as Record<string, unknown>
  return Boolean(
    item.is_active ||
    item.anti_link ||
    item.antiLinksEnabled ||
    item.welcome_digest_enabled ||
    item.welcome_enabled ||
    item.welcomeEnabled ||
    item.warnings_enabled ||
    item.warningsEnabled ||
    ensureString(item.bad_words || item.banned_words || item.forbiddenWords).trim()
  )
}

function activityTime(activity: ActivityItem, locale = "fr-FR") {
  const raw = activity.created_at || activity.timestamp
  if (!raw) return "--:--"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return "--:--"
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date)
}

function activityType(activity: ActivityItem, t: (key: string) => string) {
  const action = ensureString(activity.action, "Action").replace(/_/g, " ")
  if (action.toLowerCase().includes("welcome")) return t("type_welcome")
  if (action.toLowerCase().includes("schedule")) return t("type_scheduled")
  if (action.toLowerCase().includes("message")) return t("type_message")
  return action
}

function activityPreview(activity: ActivityItem) {
  const details = typeof activity.details === "string" ? activity.details : JSON.stringify(activity.details || "")
  return formatApercu(details || activity.action || "Action executed")
}

function formatApercu(raw: string) {
  if (!raw) return "-"
  const readable = raw.replace(/_/g, " ")

  try {
    const parsed = JSON.parse(raw)
    if (parsed.message?.conversation) return parsed.message.conversation
    if (parsed.message?.extendedTextMessage?.text) return parsed.message.extendedTextMessage.text
    if (parsed.message?.imageMessage?.caption) return `Image - ${parsed.message.imageMessage.caption || "Image"}`
    if (parsed.message?.videoMessage?.caption) return `Video - ${parsed.message.videoMessage.caption || "Video"}`
    if (parsed.body) return ensureString(parsed.body)
    if (parsed.text) return ensureString(parsed.text)
    if (parsed.preview) return ensureString(parsed.preview)

    const type = Object.keys(parsed.message || {})[0]
    if (type) return `[${type}]`
    if (parsed.recipient) return "Message WhatsApp"
    return "Action executée"
  } catch {
    return readable
  }
}
