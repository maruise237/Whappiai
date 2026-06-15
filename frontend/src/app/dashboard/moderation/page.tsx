"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  CheckCircle2,
  Info,
  Link2,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Search,
  Shield,
  Smartphone,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { emitWappyEvent } from "@/lib/wappy-events"
import { useAuth } from "@clerk/clerk-react"
import { useWebSocket } from "@/providers/websocket-provider"
import { toast } from "sonner"
import { cn, ensureString, safeRender } from "@/lib/utils"
import { getPlanCode } from "@/components/dashboard/plan-badge"
import { useTranslation } from "react-i18next"

type SessionItem = {
  sessionId?: string
  isConnected?: boolean
  status?: string
  [key: string]: unknown
}

type GroupSettings = {
  antiLinksEnabled?: boolean
  welcomeEnabled?: boolean
  warningsEnabled?: boolean
  exclusionEnabled?: boolean
  welcomeMessage?: string
  warningMessage?: string
  forbiddenWords?: string
  welcomeDigestTime?: string
  maxWarnings?: number
  [key: string]: unknown
}

type GroupItem = {
  id?: string
  jid?: string
  subject?: string
  name?: string
  participantCount?: number
  settings?: GroupSettings
  [key: string]: unknown
}

type WarnedMember = {
  userId?: string
  phone?: string
  count?: number
  lastWarningAt?: string
  risk?: "low" | "medium" | "high"
  [key: string]: unknown
}

type EngagementTask = {
  id?: number
  message_content?: string
  scheduled_at?: string
  recurrence?: "none" | "daily" | "weekly"
  status?: "pending" | "processing" | "completed" | "failed"
  last_run_at?: string
  [key: string]: unknown
}

const defaultWelcomeMessage = "default_welcome_message"
const defaultWarningMessage = "default_warning_message"

const presets = (t: (key: string) => string): Array<{ name: string; patch: Partial<GroupSettings> }> => [
  {
    name: t("preset_professionnel"),
    patch: {
      antiLinksEnabled: true,
      warningsEnabled: true,
      exclusionEnabled: true,
      maxWarnings: 3,
      forbiddenWords: t("preset_professionnel_forbidden"),
      warningMessage: t("preset_professionnel_warning"),
    },
  },
  {
    name: t("preset_education"),
    patch: {
      antiLinksEnabled: true,
      welcomeEnabled: true,
      warningsEnabled: true,
      exclusionEnabled: true,
      maxWarnings: 3,
      forbiddenWords: t("preset_education_forbidden"),
      welcomeMessage: t("preset_education_welcome"),
      warningMessage: t("preset_education_warning"),
      welcomeDigestTime: "18:00",
    },
  },
  {
    name: t("preset_tontine"),
    patch: {
      antiLinksEnabled: true,
      warningsEnabled: true,
      exclusionEnabled: true,
      maxWarnings: 2,
      forbiddenWords: t("preset_tontine_forbidden"),
      warningMessage: t("preset_tontine_warning"),
    },
  },
  {
    name: t("preset_suivi_client"),
    patch: {
      antiLinksEnabled: true,
      welcomeEnabled: true,
      warningsEnabled: true,
      exclusionEnabled: true,
      maxWarnings: 3,
      forbiddenWords: t("preset_suivi_client_forbidden"),
      welcomeMessage: t("preset_suivi_client_welcome"),
      warningMessage: t("preset_suivi_client_warning"),
      welcomeDigestTime: "17:30",
    },
  },
]

export default function ModerationPage() {
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()
  const { t } = useTranslation('moderation')
  const [sessions, setSessions] = React.useState<SessionItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = React.useState("")
  const [groups, setGroups] = React.useState<GroupItem[]>([])
  const [loadingSessions, setLoadingSessions] = React.useState(true)
  const [loadingGroups, setLoadingGroups] = React.useState(false)
  const [savingGroupId, setSavingGroupId] = React.useState<string | null>(null)
  const [schedulingGroupId, setSchedulingGroupId] = React.useState<string | null>(null)
  const [resettingWarningId, setResettingWarningId] = React.useState<string | null>(null)
  const [scheduledDrafts, setScheduledDrafts] = React.useState<Record<string, { message: string; scheduledAt: string; recurrence: string }>>({})
  const [warnedMembersByGroup, setWarnedMembersByGroup] = React.useState<Record<string, WarnedMember[]>>({})
  const [tasksByGroup, setTasksByGroup] = React.useState<Record<string, EngagementTask[]>>({})
  const [presetByGroup, setPresetByGroup] = React.useState<Record<string, string>>({})
  const [activePlan, setActivePlan] = React.useState("trial")
  const [entitlements, setEntitlements] = React.useState({
    moderationPresets: false,
    aiAssistant: false,
    aiGeneration: false,
    scheduledMessages: 0,
    scheduledMessagesUnlimited: false,
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const [savedGroupIds, setSavedGroupIds] = React.useState<Record<string, boolean>>({})
  const groupDataRef = React.useRef<GroupItem[]>([])
  const debounceTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const connectedSessions = sessions.filter(session => session.isConnected || session.status === "CONNECTED")
  const normalizedPlan = getPlanCode(activePlan)
  const managedGroupLimit = getPlanGroupLimit(normalizedPlan)
  const managedGroupCount = React.useMemo(
    () => groups.filter(group => isManagedGroupSettings(group.settings, t)).length,
    [groups, t]
  )
  const remainingManagedGroups = Math.max(managedGroupLimit - managedGroupCount, 0)
  const isManagedGroupLimitReached = remainingManagedGroups <= 0
  const canUsePresets = Boolean(entitlements.moderationPresets)
  const canUseScheduledMessages = entitlements.scheduledMessagesUnlimited || Number(entitlements.scheduledMessages) > 0

  const fetchSessions = React.useCallback(async () => {
    setLoadingSessions(true)
    try {
      const token = await getToken()
      const [data, profileResult, subscriptionResult] = await Promise.all([
        api.sessions.list(token || undefined),
        api.auth.check(token || undefined).catch(() => null),
        api.subscriptions.current(token || undefined).catch(() => null),
      ])
      const list = Array.isArray(data) ? (data as SessionItem[]) : []
      setSessions(list)
      const userProfile = profileResult?.user || profileResult
      setActivePlan(getPlanCode(
        subscriptionResult?.plan_code ||
        subscriptionResult?.plan_id ||
        userProfile?.plan_id ||
        userProfile?.plan ||
        userProfile?.subscription_plan ||
        "trial"
      ))
      setEntitlements({
        moderationPresets: Boolean(subscriptionResult?.entitlements?.moderationPresets),
        aiAssistant: Boolean(subscriptionResult?.entitlements?.aiAssistant),
        aiGeneration: Boolean(subscriptionResult?.entitlements?.aiGeneration),
        scheduledMessages: subscriptionResult?.entitlements?.scheduledMessages ?? 0,
        scheduledMessagesUnlimited: Boolean(subscriptionResult?.entitlements?.scheduledMessagesUnlimited),
      })
      const firstConnected = list.find(session => session.isConnected || session.status === "CONNECTED")
      setSelectedSessionId(prev => prev || ensureString(firstConnected?.sessionId || list[0]?.sessionId || ""))
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement des sessions")
    } finally {
      setLoadingSessions(false)
    }
  }, [getToken])

  const fetchGroupOperations = React.useCallback(async (sourceGroups: GroupItem[], token?: string) => {
    if (!selectedSessionId) return

    const pairs = await Promise.all(
      sourceGroups.map(async group => {
        const groupId = ensureString(group.id || group.jid)
        if (!groupId) return null

        const [warningsResult, tasksResult] = await Promise.allSettled([
          api.sessions.getWarnings(selectedSessionId, groupId, token),
          api.sessions.getEngagementTasks(selectedSessionId, groupId, token),
        ])

        return {
          groupId,
          warnings: warningsResult.status === "fulfilled" && Array.isArray(warningsResult.value) ? warningsResult.value as WarnedMember[] : [],
          tasks: tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value) ? tasksResult.value as EngagementTask[] : [],
        }
      })
    )

    const warningsMap: Record<string, WarnedMember[]> = {}
    const tasksMap: Record<string, EngagementTask[]> = {}
    pairs.forEach(pair => {
      if (!pair) return
      warningsMap[pair.groupId] = pair.warnings
      tasksMap[pair.groupId] = sortTasks(pair.tasks)
    })
    setWarnedMembersByGroup(warningsMap)
    setTasksByGroup(tasksMap)
  }, [selectedSessionId])

  const fetchGroups = React.useCallback(async () => {
    if (!selectedSessionId) {
      setGroups([])
      setWarnedMembersByGroup({})
      setTasksByGroup({})
      return
    }

    setLoadingGroups(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getGroups(selectedSessionId, token || undefined)
      const rawGroups = Array.isArray(data) ? (data as GroupItem[]) : []
      const enriched = await Promise.all(
        rawGroups.map(async group => {
          const groupId = ensureString(group.id || group.jid)
          if (!groupId) return group
          try {
            const settings = await api.sessions.getGroupSettings(selectedSessionId, groupId, token || undefined)
            return { ...group, settings: normalizeSettings(settings, t) }
          } catch {
            return { ...group, settings: normalizeSettings(group.settings, t) }
          }
        })
      )
      setGroups(enriched)
      await fetchGroupOperations(rawGroups, token || undefined)
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement des groupes")
    } finally {
      setLoadingGroups(false)
    }
  }, [fetchGroupOperations, getToken, selectedSessionId])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  React.useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  React.useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type === "session-update" || lastMessage.type === "session-deleted") {
      fetchSessions()
    }
  }, [fetchSessions, lastMessage])

  // Keep groupDataRef in sync for auto-save debounce
  React.useEffect(() => {
    groupDataRef.current = groups
  }, [groups])

  // Cleanup debounce timers on unmount
  React.useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  const updateLocalGroup = (groupId: string, patch: Partial<GroupSettings>) => {
    const currentGroup = groupDataRef.current.find(group => ensureString(group.id || group.jid) === groupId)
    if (currentGroup) {
      const currentSettings = normalizeSettings(currentGroup.settings, t)
      const nextSettings = { ...currentSettings, ...patch }
      const isCurrentlyManaged = isManagedGroupSettings(currentSettings, t)
      const willBeManaged = isManagedGroupSettings(nextSettings, t)

      if (!isCurrentlyManaged && willBeManaged && isManagedGroupLimitReached) {
        toast.error(`Limite atteinte: votre plan ${planLabel(activePlan)} couvre ${managedGroupLimit} groupe(s) modere(s).`)
        emitWappyEvent({
          type: "moderation",
          action: "limit-reached",
          groupId,
          plan: normalizedPlan,
        })
        return
      }
    }

    setGroups(prev => prev.map(group => {
      const currentId = ensureString(group.id || group.jid)
      if (currentId !== groupId) return group
      return {
        ...group,
        settings: {
          ...normalizeSettings(group.settings, t),
          ...patch,
        },
      }
    }))

    // Debounced auto-save: reset timer on each change, save after 2s of inactivity
    if (debounceTimers.current[groupId]) {
      clearTimeout(debounceTimers.current[groupId])
    }
    debounceTimers.current[groupId] = setTimeout(() => {
      const group = groupDataRef.current.find(g => ensureString(g.id || g.jid) === groupId)
      if (group) {
        saveGroup(group)
        setSavedGroupIds(prev => ({ ...prev, [groupId]: true }))
        setTimeout(() => {
          setSavedGroupIds(prev => ({ ...prev, [groupId]: false }))
        }, 2000)
      }
    }, 2000)
  }

  const applyPreset = (groupId: string, preset: { name: string; patch: Partial<GroupSettings> }) => {
    if (!canUsePresets) {
      toast.error(t("toast_presets_pro_required", { plan: planLabel(activePlan) }))
      return
    }
    updateLocalGroup(groupId, preset.patch)
    setPresetByGroup(prev => ({ ...prev, [groupId]: preset.name }))
  }

  const saveGroup = async (group: GroupItem) => {
    const groupId = ensureString(group.id || group.jid)
    if (!selectedSessionId || !groupId) return

    setSavingGroupId(groupId)
    try {
      const token = await getToken()
      const response = await api.sessions.updateGroupSettings(selectedSessionId, groupId, toModerationPayload(group.settings, t), token || undefined)
      const quotaLabel = moderationQuotaLabel(response?.meta?.groups_used, response?.meta?.group_limit, t)
      toast.success(`${ensureString(group.subject || group.name, "Groupe")} mis a jour${quotaLabel ? ` - ${quotaLabel}` : ""}`)
      emitWappyEvent({
        type: "moderation",
        action: "rule-updated",
        groupId,
        sessionId: selectedSessionId,
      })
    } catch (error) {
      console.error(error)
      const msg = error instanceof Error ? error.message : "Erreur inconnue"
      toast.error(msg)
      emitWappyEvent({
        type: "system",
        action: "error",
        groupId,
        sessionId: selectedSessionId,
        errorType: "moderation-save-failed",
      })
    } finally {
      setSavingGroupId(null)
    }
  }

  const scheduleDailyWelcome = async (group: GroupItem) => {
    const groupId = ensureString(group.id || group.jid)
    if (!selectedSessionId || !groupId) return

    if (!canUseScheduledMessages) {
      toast.error(t("toast_scheduled_pro_required", { plan: planLabel(activePlan) }))
      return
    }

    const settings = normalizeSettings(group.settings, t)
    if (!isManagedGroupSettings(settings, t) && isManagedGroupLimitReached) {
      toast.error(t("toast_group_limit_reached", { plan: planLabel(activePlan), limit: managedGroupLimit }))
      emitWappyEvent({
        type: "moderation",
        action: "limit-reached",
        groupId,
        plan: normalizedPlan,
      })
      return
    }
    setSchedulingGroupId(groupId)
    try {
      const token = await getToken()
      const response = await api.sessions.updateGroupSettings(selectedSessionId, groupId, toModerationPayload({
        ...settings,
        welcomeEnabled: true,
      }, t), token || undefined)
      await api.sessions.addEngagementTask(selectedSessionId, groupId, {
        message_content: settings.welcomeMessage,
        recurrence: "daily",
        scheduled_at: nextDailyIso(settings.welcomeDigestTime),
        type: "text"
      }, token || undefined)
      await refreshGroupOperations(groupId, token || undefined)
      updateLocalGroup(groupId, { welcomeEnabled: true })
      const quotaLabel = moderationQuotaLabel(response?.meta?.groups_used, response?.meta?.group_limit, t)
      toast.success(`${t("toast_daily_welcome_scheduled")}${quotaLabel ? ` - ${quotaLabel}` : ""}`)
      emitWappyEvent({
        type: "engagement",
        action: "welcome-scheduled",
        groupId,
        sessionId: selectedSessionId,
      })
    } catch (error) {
      console.error(error)
      toast.error(t("toast_daily_welcome_error"))
      emitWappyEvent({
        type: "system",
        action: "error",
        groupId,
        sessionId: selectedSessionId,
        errorType: "welcome-schedule-failed",
      })
    } finally {
      setSchedulingGroupId(null)
    }
  }

  const updateScheduledDraft = (groupId: string, patch: Partial<{ message: string; scheduledAt: string; recurrence: string }>) => {
    setScheduledDrafts(prev => {
      const current = prev[groupId] || { message: "", scheduledAt: defaultScheduleDateTime(), recurrence: "none" }
      return {
        ...prev,
        [groupId]: {
          ...current,
          ...patch,
        },
      }
    })
  }

  const scheduleCustomMessage = async (group: GroupItem) => {
    const groupId = ensureString(group.id || group.jid)
    if (!selectedSessionId || !groupId) return
    if (!canUseScheduledMessages) {
      toast.error(t("toast_scheduled_pro_required", { plan: planLabel(activePlan) }))
      return
    }
    const draft = scheduledDrafts[groupId] || { message: "", scheduledAt: defaultScheduleDateTime(), recurrence: "none" }
    if (!draft.message.trim()) return toast.error(t("toast_schedule_message_required"))
    if (!draft.scheduledAt) return toast.error(t("toast_schedule_date_required"))

    setSchedulingGroupId(groupId)
    try {
      const token = await getToken()
      await api.sessions.addEngagementTask(selectedSessionId, groupId, {
        message_content: draft.message,
        recurrence: draft.recurrence,
        scheduled_at: new Date(draft.scheduledAt).toISOString(),
        type: "text"
      }, token || undefined)
      await refreshGroupOperations(groupId, token || undefined)
      setScheduledDrafts(prev => ({
        ...prev,
        [groupId]: { message: "", scheduledAt: defaultScheduleDateTime(), recurrence: draft.recurrence },
      }))
      toast.success(t("toast_message_scheduled"))
      emitWappyEvent({
        type: "engagement",
        action: "task-created",
        groupId,
        sessionId: selectedSessionId,
      })
    } catch (error) {
      console.error(error)
      toast.error(t("toast_message_schedule_error"))
      emitWappyEvent({
        type: "system",
        action: "error",
        groupId,
        sessionId: selectedSessionId,
        errorType: "task-create-failed",
      })
    } finally {
      setSchedulingGroupId(null)
    }
  }

  const refreshGroupOperations = async (groupId: string, token?: string) => {
    if (!selectedSessionId || !groupId) return
    const [warningsResult, tasksResult] = await Promise.allSettled([
      api.sessions.getWarnings(selectedSessionId, groupId, token),
      api.sessions.getEngagementTasks(selectedSessionId, groupId, token),
    ])
    if (warningsResult.status === "fulfilled" && Array.isArray(warningsResult.value)) {
      setWarnedMembersByGroup(prev => ({ ...prev, [groupId]: warningsResult.value as WarnedMember[] }))
    }
    if (tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value)) {
      setTasksByGroup(prev => ({ ...prev, [groupId]: sortTasks(tasksResult.value as EngagementTask[]) }))
    }
  }

  const deleteScheduledTask = async (groupId: string, taskId?: number) => {
    if (!taskId) return
    setSchedulingGroupId(groupId)
    try {
      const token = await getToken()
      await api.sessions.deleteEngagementTask(taskId, token || undefined)
      setTasksByGroup(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(task => task.id !== taskId),
      }))
      toast.success(t("toast_message_deleted"))
      emitWappyEvent({
        type: "engagement",
        action: "task-deleted",
        groupId,
        sessionId: selectedSessionId,
      })
    } catch (error) {
      console.error(error)
      toast.error(t("toast_message_delete_error"))
      emitWappyEvent({
        type: "system",
        action: "error",
        groupId,
        sessionId: selectedSessionId,
        errorType: "task-delete-failed",
      })
    } finally {
      setSchedulingGroupId(null)
    }
  }

  const resetMemberWarnings = async (groupId: string, member: WarnedMember) => {
    const userId = ensureString(member.userId)
    if (!selectedSessionId || !groupId || !userId) return

    const resetKey = `${groupId}:${userId}`
    setResettingWarningId(resetKey)
    try {
      const token = await getToken()
      await api.sessions.resetWarningMember(selectedSessionId, groupId, userId, token || undefined)
      setWarnedMembersByGroup(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(item => ensureString(item.userId) !== userId),
      }))
      toast.success("Avertissements remis a zero")
      emitWappyEvent({
        type: "moderation",
        action: "warnings-reset",
        groupId,
        sessionId: selectedSessionId,
        userId,
      })
    } catch (error) {
      console.error(error)
      toast.error("Impossible de remettre ces avertissements a zero")
      emitWappyEvent({
        type: "system",
        action: "error",
        groupId,
        sessionId: selectedSessionId,
        userId,
        errorType: "warnings-reset-failed",
      })
    } finally {
      setResettingWarningId(null)
    }
  }

  const filteredGroups = groups.filter(group =>
    ensureString(group.subject || group.name).toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loadingSessions) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin opacity-40" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="space-y-2">
          <Badge className="border-primary/15 bg-primary/10 text-primary hover:bg-primary/10">{t("badge")}</Badge>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Shield className="h-6 w-6 text-primary" /> {t("title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="h-10 w-full lg:w-[260px]">
              <SelectValue placeholder={t("session_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(session => (
                <SelectItem key={ensureString(session.sessionId)} value={ensureString(session.sessionId)}>
                  {safeRender(session.sessionId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search_placeholder")}
              className="h-10 pl-9"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card shadow-none">
          <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-primary/15 bg-primary/10 text-primary hover:bg-primary/10">
                  {t("plan_badge", { plan: planLabel(activePlan) })}
                </Badge>
                <Badge variant="outline">
                  {t("quota_badge", { used: managedGroupCount, limit: managedGroupLimit })}
                </Badge>
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight sm:text-xl">
                  {t("hero_title")}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {t("hero_text")}
                </p>
              </div>
            </div>
            <Link href="/dashboard/billing">
              <Button className="w-full whitespace-nowrap lg:w-auto">
                {isManagedGroupLimitReached ? t("hero_cta_quota") : t("hero_cta_plan")}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t("next_action_title")}</p>
              <Badge variant="outline" className="text-[10px]">
                {connectedSessions.length > 0 ? t("session_ok_badge") : t("session_required_badge")}
              </Badge>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={cn("h-4 w-4", connectedSessions.length > 0 ? "text-primary" : "text-muted-foreground")} />
                <span>{t("check_session_connected")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={cn("h-4 w-4", groups.length > 0 ? "text-primary" : "text-muted-foreground")} />
                <span>{t("check_groups_detected")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={cn("h-4 w-4", managedGroupCount > 0 ? "text-primary" : "text-muted-foreground")} />
                <span>{t("check_rule_active")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title={t("empty_no_sessions_title")}
          text={t("empty_no_sessions_text")}
          actionLabel={t("empty_no_sessions_action")}
          href="/dashboard"
        />
      ) : connectedSessions.length === 0 ? (
        <EmptyState
          title={t("empty_no_connection_title")}
          text={t("empty_no_connection_text")}
          actionLabel={t("empty_no_connection_action")}
          href="/dashboard"
        />
      ) : loadingGroups ? (
        <div className="grid min-h-[320px] place-items-center rounded-2xl border bg-card text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin opacity-40" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          title={t("empty_no_groups_title")}
          text={t("empty_no_groups_text")}
          actionLabel={t("empty_no_groups_action")}
          onClick={fetchGroups}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-primary">
              <Shield className="h-4 w-4 shrink-0" />
              {t("quota_line", { used: managedGroupCount, limit: managedGroupLimit, plan: planLabel(activePlan) })}
              {isManagedGroupLimitReached
                ? t("quota_line_full")
                : t("quota_line_remaining", { remaining: remainingManagedGroups })}
            </span>
            <Link href="/dashboard/billing" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">
              {isManagedGroupLimitReached ? t("quota_cta_upgrade") : t("quota_cta_plan")}
            </Link>
          </div>

          {normalizedPlan === "trial" && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 text-amber-700">
                <Info className="h-4 w-4 shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: t("trial_banner_text") }} />
              </span>
              <Link href="/dashboard/billing" className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800">
                {t("trial_banner_cta")}
              </Link>
            </div>
          )}

        <Accordion type="single" collapsible className="gap-3">
          {filteredGroups.map(group => {
            const groupId = ensureString(group.id || group.jid)
            const settings = normalizeSettings(group.settings, t)
            const groupIsManaged = isManagedGroupSettings(settings, t)
            const groupIsLocked = !groupIsManaged && isManagedGroupLimitReached
            const activeCount = [
              settings.antiLinksEnabled,
              Boolean(settings.forbiddenWords.trim()),
              settings.warningsEnabled,
              settings.welcomeEnabled,
            ].filter(Boolean).length
            const warnedMembers = warnedMembersByGroup[groupId] || []
            const scheduledTasks = tasksByGroup[groupId] || []
            const groupName = ensureString(group.subject || group.name, t("group_unnamed"))
            const activePreset = presetByGroup[groupId] || detectPresetName(settings, t)

            return (
              <AccordionItem key={groupId} value={groupId} className="overflow-hidden rounded-2xl border bg-card">
                <AccordionTrigger className="rounded-none px-4 py-4 hover:no-underline sm:px-5">
                  <div className="flex min-w-0 flex-1 flex-col gap-3 pr-3 sm:flex-row sm:items-center">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                      getGroupColor(groupId)
                    )}>
                      {groupName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold" title={groupName}>{truncateGroupName(groupName)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.participantCount ? `${safeRender(group.participantCount)} ${t("group_members")} - ` : ""}{activeCount}/4 {t("group_rules_active")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                        <Badge className={cn(
                          "border-none text-[10px]",
                          activeCount > 0 ? "bg-primary/10 text-primary hover:bg-primary/10" : "bg-muted text-muted-foreground"
                        )}>
                          {activeCount > 0 ? t("group_active_badge") : t("group_inactive_badge")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{activeCount} {activeCount > 1 ? t("group_rules_count_plural") : t("group_rules_count")}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <Badge className={cn(
                      "border-none text-[10px]",
                      activeCount > 0 ? "bg-primary/10 text-primary hover:bg-primary/10" : "bg-muted text-muted-foreground"
                    )}>
                      {activeCount > 0 ? t("group_active_badge") : t("group_inactive_badge")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{activeCount} {activeCount > 1 ? t("group_rules_count_plural") : t("group_rules_count")}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="sticky top-0 z-10 flex flex-col gap-3 border-y bg-card/95 px-4 py-3 backdrop-blur sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{groupName}</p>
                      <p className="text-xs text-muted-foreground">{t("preset_active")} : {activePreset || t("preset_none")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {groupIsLocked && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                          {t("plan_full_badge")}
                        </Badge>
                      )}
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {activeRuleLabel(activeCount, t)}
                    </div>
                  </div>
                  <div className="space-y-4 p-4 sm:p-5">
                  {groupIsLocked && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                      {t("group_locked_message", { plan: planLabel(activePlan), limit: managedGroupLimit })}
                    </div>
                  )}
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{t("essential_rules_title")}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {t("essential_rules_desc")}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit bg-background text-[10px]">
                        {t("included_in_plan", { plan: planLabel(activePlan) })}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <RuleSwitch
                        icon={<Link2 className="h-4 w-4" />}
                        title={t("rule_antilinks_switch_title")}
                        text={t("rule_antilinks_switch_text")}
                        checked={settings.antiLinksEnabled}
                        disabled={groupIsLocked}
                        onCheckedChange={checked => updateLocalGroup(groupId, { antiLinksEnabled: checked })}
                      />
                      <SectionPanel enabled={Boolean(settings.forbiddenWords.trim())} icon={<Shield className="h-4 w-4" />} title={t("rule_forbidden_title")} text={t("rule_forbidden_text")} t={t}>
                        <ForbiddenWordsInput
                          value={settings.forbiddenWords}
                          planLimit={forbiddenWordsLimit(activePlan)}
                          disabled={groupIsLocked}
                          onChange={value => updateLocalGroup(groupId, { forbiddenWords: value })}
                          t={t}
                        />
                      </SectionPanel>
                      <RuleSwitch
                        icon={<AlertTriangle className="h-4 w-4" />}
                        title={t("rule_warning_switch_title")}
                        text={t("rule_warning_switch_text")}
                        checked={settings.warningsEnabled}
                        disabled={groupIsLocked}
                        onCheckedChange={checked => updateLocalGroup(groupId, { warningsEnabled: checked })}
                      />
                      {settings.warningsEnabled && (
                        <div className="space-y-3 rounded-2xl border bg-card p-4">
                          <Textarea
                            value={settings.warningMessage}
                            onChange={event => updateLocalGroup(groupId, { warningMessage: event.target.value })}
                            className="min-h-24 resize-none text-xs"
                            placeholder={t("rule_warning_placeholder")}
                          />
                          <div className="rounded-xl border bg-background/60 p-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold">{t("rule_exclusion_title")}</p>
                                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                                  {t("rule_exclusion_desc")}
                                </p>
                              </div>
                              <Switch
                                checked={settings.exclusionEnabled}
                                onCheckedChange={checked => updateLocalGroup(groupId, { exclusionEnabled: checked })}
                                aria-label={t("rule_exclusion_title")}
                              />
                            </div>
                            {settings.exclusionEnabled && (
                              <div className="mt-3 grid gap-2 lg:grid-cols-[180px_1fr] lg:items-center">
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={settings.maxWarnings}
                                  onChange={event => updateLocalGroup(groupId, { maxWarnings: clampWarningLimit(event.target.value) })}
                                  className="h-10 text-xs"
                                />
                                <p className="text-[10px] leading-4 text-muted-foreground">
                                  {t("rule_exclusion_example", { max: settings.maxWarnings })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <RuleSwitch
                        icon={<MessageSquareText className="h-4 w-4" />}
                        title={t("rule_welcome_switch_title")}
                        text={t("rule_welcome_switch_text")}
                        checked={settings.welcomeEnabled}
                        disabled={groupIsLocked}
                        onCheckedChange={checked => updateLocalGroup(groupId, { welcomeEnabled: checked })}
                      />
                      {settings.welcomeEnabled && (
                        <div className="space-y-3 rounded-2xl border bg-card p-4">
                          <Textarea
                            value={settings.welcomeMessage}
                            onChange={event => updateLocalGroup(groupId, { welcomeMessage: event.target.value })}
                            className="min-h-24 resize-none text-xs"
                            placeholder={t("rule_welcome_placeholder")}
                          />
                          <p className="text-[10px] leading-4 text-muted-foreground">
                            {t("manual_welcome_hint")}
                          </p>
                          {canUseScheduledMessages && (
                            <div className="grid gap-3 rounded-xl border bg-background/60 p-3 lg:grid-cols-[140px_1fr] lg:items-center">
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  {t("rule_welcome_send_time")}
                                </label>
                                <Input
                                  type="time"
                                  value={settings.welcomeDigestTime}
                                  onChange={event => updateLocalGroup(groupId, { welcomeDigestTime: event.target.value })}
                                  className="h-10 text-xs"
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-full text-xs lg:w-fit"
                                onClick={() => scheduleDailyWelcome(group)}
                                disabled={schedulingGroupId === groupId || groupIsLocked}
                              >
                                {schedulingGroupId === groupId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-3.5 w-3.5" />}
                                {t("scheduled_button")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-background/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{t("presets_title")}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {t("presets_desc")}
                        </p>
                      </div>
                      {!canUsePresets && (
                        <Badge variant="outline" className="border-state-warning/30 bg-state-warning-light text-state-warning">
                          {t("pro_required_badge")}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {presets(t).map(preset => (
                        <Button
                          key={preset.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 border text-[11px]",
                            activePreset === preset.name
                              ? "border-primary bg-primary text-primary-foreground hover:bg-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                          onClick={() => applyPreset(groupId, preset)}
                          disabled={groupIsLocked || !canUsePresets}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                    {!canUsePresets && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("presets_locked_text")}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">{t("preset_active")} : {activePreset || t("preset_none")}</p>
                  </div>
                  {(() => {
                    const scheduledDraft = scheduledDrafts[groupId] || { message: "", scheduledAt: defaultScheduleDateTime(), recurrence: "none" }
                    if (!canUseScheduledMessages && scheduledTasks.length === 0) {
                      return (
                        <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Clock3 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{t("pro_automation_title")}</p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {t("pro_automation_desc")}
                              </p>
                            </div>
                          </div>
                          <Link href="/dashboard/billing" className="w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="w-full text-xs sm:w-auto">
                              {t("pro_automation_cta")}
                            </Button>
                          </Link>
                        </div>
                      )
                    }
                    return (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Clock3 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t("scheduled_message_title")}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {t("scheduled_message_desc")}
                            </p>
                          </div>
                        </div>
                        {canUseScheduledMessages ? (
                          <div className="space-y-3">
                            <Textarea
                              value={scheduledDraft.message}
                              onChange={event => updateScheduledDraft(groupId, { message: event.target.value })}
                              className="min-h-20 resize-none text-xs"
                              placeholder={t("scheduled_message_placeholder")}
                            />
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_120px]">
                              <Input
                                type="datetime-local"
                                value={scheduledDraft.scheduledAt}
                                onChange={event => updateScheduledDraft(groupId, { scheduledAt: event.target.value })}
                                className="h-9 text-xs"
                              />
                              <Select
                                value={scheduledDraft.recurrence}
                                onValueChange={value => updateScheduledDraft(groupId, { recurrence: value })}
                              >
                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t("scheduled_recurrence_none")}</SelectItem>
                                  <SelectItem value="daily">{t("scheduled_recurrence_daily")}</SelectItem>
                                  <SelectItem value="weekly">{t("scheduled_recurrence_weekly")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                className="h-9 w-full text-xs lg:w-auto"
                                onClick={() => scheduleCustomMessage(group)}
                                disabled={schedulingGroupId === groupId}
                              >
                                {schedulingGroupId === groupId ? <Loader2 className="h-4 w-4 animate-spin" /> : t("scheduled_button")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed bg-background/60 p-4 text-xs leading-5 text-muted-foreground">
                            {t("scheduled_legacy_locked")}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border bg-background/60 p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t("warned_members_title")}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("warned_members_desc")}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full px-2.5 text-[10px]">
                          {warnedMembers.length}
                        </Badge>
                      </div>
                      {warnedMembers.length === 0 ? (
                        <p className="rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground">
                          {t("warned_members_empty")}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {warnedMembers.slice(0, 5).map(member => (
                            <div key={ensureString(member.userId)} className="flex flex-col gap-3 rounded-xl border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{safeRender(member.phone || member.userId)}</p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">{formatScheduleDate(member.lastWarningAt, t)}</p>
                              </div>
                              <div className="flex shrink-0 items-center justify-between gap-1.5 sm:justify-end">
                                <Badge className={cn("border-none text-[10px]", riskClass(member.risk))}>
                                  {member.count || 0} {t("warned_members_count")}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 sm:size-7 text-muted-foreground hover:text-primary"
                                  onClick={() => resetMemberWarnings(groupId, member)}
                                  disabled={resettingWarningId === `${groupId}:${ensureString(member.userId)}`}
                                  title={t("warned_members_reset")}
                                >
                                  {resettingWarningId === `${groupId}:${ensureString(member.userId)}` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border bg-background/60 p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <CalendarDays className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t("calendar_title")}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("calendar_desc")}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full px-2.5 text-[10px]">
                          {scheduledTasks.filter(task => task.status === "pending").length}
                        </Badge>
                      </div>
                      {scheduledTasks.length === 0 ? (
                        <p className="rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground">
                          {t("calendar_empty")}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {scheduledTasks.slice(0, 5).map(task => (
                            <div key={safeRender(task.id)} className="rounded-xl border bg-card p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold">{formatScheduleDate(task.scheduled_at, t)}</p>
                                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                    {safeRender(task.message_content, t("calendar_no_content"))}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 sm:size-7 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteScheduledTask(groupId, task.id)}
                                  disabled={schedulingGroupId === groupId}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="text-[10px]">{recurrenceLabel(task.recurrence, t)}</Badge>
                                <span className="text-[10px] text-muted-foreground">{safeRender(task.status, "pending")}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t bg-card/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {activeRuleLabel(activeCount, t)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {managedGroupCount}/{managedGroupLimit} groupe(s) proteges
                      </span>
                    {savedGroupIds[groupId] ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("saved_indicator")}
                      </div>
                    ) : null}
                    </div>
                  </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
        </div>
      )}
    </div>
  )
}

function normalizeSettings(settings?: GroupSettings | null, t?: (key: string) => string): Required<Pick<GroupSettings, "antiLinksEnabled" | "welcomeEnabled" | "warningsEnabled" | "exclusionEnabled" | "welcomeMessage" | "warningMessage" | "forbiddenWords" | "welcomeDigestTime" | "maxWarnings">> {
  const fallbackWelcome = t ? t("default_welcome_message") : "default_welcome_message"
  const fallbackWarning = t ? t("default_warning_message") : "default_warning_message"
  return {
    antiLinksEnabled: Boolean(settings?.antiLinksEnabled ?? settings?.anti_link ?? settings?.anti_links_enabled ?? settings?.antiLinkEnabled),
    welcomeEnabled: Boolean(settings?.welcomeEnabled ?? settings?.welcome_digest_enabled ?? settings?.welcome_enabled),
    warningsEnabled: Boolean(settings?.warningsEnabled ?? settings?.warnings_enabled ?? settings?.warningsEnabled),
    exclusionEnabled: Boolean(settings?.exclusionEnabled ?? settings?.auto_kick_enabled ?? settings?.exclusion_enabled),
    welcomeMessage: ensureString(settings?.welcomeMessage ?? settings?.welcome_message, fallbackWelcome),
    warningMessage: ensureString(settings?.warningMessage ?? settings?.warning_message, fallbackWarning),
    forbiddenWords: ensureString(settings?.forbiddenWords ?? settings?.bad_words ?? settings?.banned_words, ""),
    welcomeDigestTime: ensureString(settings?.welcomeDigestTime ?? settings?.welcome_digest_time, "18:00"),
    maxWarnings: clampWarningLimit(settings?.maxWarnings ?? settings?.max_warnings ?? 3),
  }
}

function toModerationPayload(settings?: GroupSettings | null, t?: (key: string) => string) {
  const normalized = normalizeSettings(settings, t)
  return {
    is_active: normalized.antiLinksEnabled || normalized.welcomeEnabled || normalized.warningsEnabled || Boolean(normalized.forbiddenWords.trim()),
    anti_link: normalized.antiLinksEnabled,
    bad_words: normalized.forbiddenWords,
    warnings_enabled: normalized.warningsEnabled,
    auto_kick_enabled: normalized.exclusionEnabled,
    warning_template: normalized.warningMessage,
    max_warnings: normalized.maxWarnings,
    welcome_enabled: false,
    welcome_template: normalized.welcomeMessage,
    welcome_digest_enabled: normalized.welcomeEnabled,
    welcome_digest_time: normalized.welcomeDigestTime,
  }
}

function nextDailyIso(time: string) {
  const [hourRaw, minuteRaw] = time.split(":")
  const date = new Date()
  date.setHours(Number(hourRaw) || 18, Number(minuteRaw) || 0, 0, 0)
  if (date.getTime() <= Date.now()) {
    date.setDate(date.getDate() + 1)
  }
  return date.toISOString()
}

function defaultScheduleDateTime() {
  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function sortTasks(tasks: EngagementTask[]) {
  return [...tasks].sort((a, b) => {
    const aTime = new Date(ensureString(a.scheduled_at)).getTime() || 0
    const bTime = new Date(ensureString(b.scheduled_at)).getTime() || 0
    return aTime - bTime
  })
}

function formatScheduleDate(value?: string, t?: (key: string) => string) {
  if (!value) return t ? t("unknown_date") : "Date inconnue"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t ? t("unknown_date") : "Date inconnue"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function recurrenceLabel(value?: string, t?: (key: string) => string) {
  const tFn = t || ((key: string) => key)
  if (value === "daily") return tFn("scheduled_recurrence_daily")
  if (value === "weekly") return tFn("scheduled_recurrence_weekly")
  return tFn("scheduled_recurrence_none")
}

function riskClass(value?: string) {
  if (value === "high") return "bg-destructive/10 text-destructive hover:bg-destructive/10"
  if (value === "medium") return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10"
  return "bg-primary/10 text-primary hover:bg-primary/10"
}

function clampWarningLimit(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 3
  return Math.min(10, Math.max(1, Math.round(parsed)))
}

function splitForbiddenWords(value?: string) {
  return ensureString(value)
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
}

function joinForbiddenWords(tags: string[]) {
  return Array.from(new Set(tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))).join(", ")
}

function truncateGroupName(value: string) {
  return value.length > 30 ? `${value.slice(0, 30)}...` : value
}

const GROUP_COLORS = [
  "bg-green-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
]

function getGroupColor(groupId: string) {
  const hash = groupId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return GROUP_COLORS[hash % GROUP_COLORS.length]
}

function activeRuleLabel(count: number, t: (key: string, options?: Record<string, unknown>) => string) {
  if (count === 0) return t("active_rule_zero")
  if (count === 1) return t("active_rule_one")
  return t("active_rule_other", { count })
}

function forbiddenWordsLimit(plan: string) {
  return getPlanCode(plan) === "starter" || getPlanCode(plan) === "trial" ? 20 : 999
}

function getPlanGroupLimit(plan: string) {
  const limits: Record<string, number> = {
    trial: 1,
    starter: 3,
    pro: 6,
    business: 16,
  }
  return limits[getPlanCode(plan)] ?? 1
}

function planLabel(plan: string) {
  const code = getPlanCode(plan)
  if (code === "trial") return "Essai"
  if (code === "starter") return "Starter"
  if (code === "pro") return "Pro IA"
  if (code === "business") return "Business"
  return "Essai"
}

function isManagedGroupSettings(settings?: GroupSettings | null, t?: (key: string) => string) {
  const normalized = normalizeSettings(settings, t)
  return Boolean(
    normalized.antiLinksEnabled ||
    normalized.welcomeEnabled ||
    normalized.warningsEnabled ||
    normalized.exclusionEnabled ||
    normalized.forbiddenWords.trim()
  )
}

function moderationQuotaLabel(groupsUsed?: unknown, groupLimit?: unknown, t?: (key: string, options?: Record<string, unknown>) => string) {
  const used = Number(groupsUsed)
  const limit = Number(groupLimit)
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return ""
  return t ? t("quota_badge", { used, limit }) : `${used}/${limit} groupes proteges`
}

function detectPresetName(settings: ReturnType<typeof normalizeSettings>, t: (key: string) => string) {
  const currentWords = splitForbiddenWords(settings.forbiddenWords).sort().join("|")
  const match = presets(t).find(preset => {
    const patch = normalizeSettings(preset.patch, t)
    const presetWords = splitForbiddenWords(patch.forbiddenWords).sort().join("|")
    return (
      patch.antiLinksEnabled === settings.antiLinksEnabled &&
      patch.warningsEnabled === settings.warningsEnabled &&
      patch.exclusionEnabled === settings.exclusionEnabled &&
      patch.maxWarnings === settings.maxWarnings &&
      presetWords === currentWords
    )
  })
  return match?.name || ""
}

function SectionPanel({
  enabled,
  icon,
  title,
  text,
  children,
  t,
}: {
  enabled: boolean
  icon: React.ReactNode
  title: string
  text: string
  children: React.ReactNode
  t: (key: string) => string
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-all",
      enabled
        ? "border-primary/20 bg-primary/5"
        : "border-border bg-surface-neutral opacity-70"
    )}>
      <div className="mb-3 flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          {icon}
        </div>
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {title}
            {!enabled && <span className="text-xs font-medium text-muted-foreground">{t("rule_disabled_label")}</span>}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function ForbiddenWordsInput({
  value,
  planLimit,
  disabled = false,
  onChange,
  t,
}: {
  value: string
  planLimit: number
  disabled?: boolean
  onChange: (value: string) => void
  t: (key: string, options?: Record<string, unknown>) => string
}) {
  const [draft, setDraft] = React.useState("")
  const tags = splitForbiddenWords(value)
  const isUnlimited = planLimit >= 999
  const isLimitReached = !isUnlimited && tags.length >= planLimit

  const commitTag = (raw: string) => {
    const next = raw.trim().toLowerCase()
    if (!next || tags.includes(next) || isLimitReached || disabled) return
    onChange(joinForbiddenWords([...tags, next]))
    setDraft("")
  }

  const removeTag = (tag: string) => {
    onChange(joinForbiddenWords(tags.filter(item => item !== tag)))
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1 rounded-full pr-1 text-xs">
            {tag}
            <button type="button" disabled={disabled} onClick={() => removeTag(tag)} className="rounded-full p-0.5 hover:bg-background disabled:cursor-not-allowed disabled:opacity-50" aria-label={t("forbidden_input_remove_aria", { tag })}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          disabled={isLimitReached || disabled}
          onChange={event => {
            const next = event.target.value
            if (next.includes(",")) {
              commitTag(next.replace(",", ""))
            } else {
              setDraft(next)
            }
          }}
          onKeyDown={event => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault()
              commitTag(draft)
            }
            if (event.key === "Backspace" && !draft && tags.length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          className="min-w-32 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          placeholder={disabled ? "Upgrade requis pour activer ce groupe" : isLimitReached ? t("forbidden_input_limit_reached") : t("forbidden_input_placeholder")}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs text-muted-foreground", isLimitReached && "text-state-warning")}>
          {t("forbidden_input_count", { count: tags.length, limit: isUnlimited ? t("forbidden_input_unlimited") : planLimit })}
        </span>
        {(isLimitReached || disabled) && (
          <span className="text-xs text-state-warning">{t("forbidden_input_upgrade")}</span>
        )}
      </div>
    </div>
  )
}

function RuleSwitch({
  icon,
  title,
  text,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  icon: React.ReactNode
  title: string
  text: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className={cn(
      "flex flex-col gap-4 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between",
      checked
        ? "border-primary/20 bg-primary/5"
        : "border-border bg-surface-neutral opacity-60"
    )}>
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          {icon}
        </div>
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {title}
            {!checked && <span className="text-xs font-medium text-muted-foreground">Desactive</span>}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
        </div>
      </div>
      <div className="flex justify-end sm:block">
        <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={title} />
      </div>
    </div>
  )
}

function EmptyState({
  title,
  text,
  actionLabel,
  href,
  onClick,
}: {
  title: string
  text: string
  actionLabel: string
  href?: string
  onClick?: () => void
}) {
  const content = (
    <Button size="sm" variant="outline" onClick={onClick}>
      {actionLabel}
    </Button>
  )

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Smartphone className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{text}</p>
      <div className="mt-5">
        {href ? <Link href={href}>{content}</Link> : content}
      </div>
    </div>
  )
}
