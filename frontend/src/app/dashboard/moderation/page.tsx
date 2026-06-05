"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Info,
  Link2,
  Loader2,
  MessageSquareText,
  Search,
  Shield,
  Smartphone,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { useWebSocket } from "@/providers/websocket-provider"
import { toast } from "sonner"
import { cn, ensureString, safeRender } from "@/lib/utils"

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

const defaultWelcomeMessage = "Bienvenue aux nouveaux membres arrives aujourd'hui. Merci de respecter le sujet, d'eviter les liens hors contexte et de garder les echanges utiles."
const defaultWarningMessage = "Attention : ce message ne respecte pas les regles du groupe. Merci de corriger avant une action admin."

const ruleSummary = [
  {
    icon: Link2,
    title: "Anti-liens",
    text: "Bloque les liens hors sujet avant qu'ils polluent la discussion.",
  },
  {
    icon: MessageSquareText,
    title: "Accueil quotidien",
    text: "Envoie un message de bienvenue une fois par jour en fin de journee.",
  },
  {
    icon: AlertTriangle,
    title: "Avertissements",
    text: "Previent avant sanction pour garder une moderation lisible.",
  },
]

export default function ModerationPage() {
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()
  const [sessions, setSessions] = React.useState<SessionItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = React.useState("")
  const [groups, setGroups] = React.useState<GroupItem[]>([])
  const [loadingSessions, setLoadingSessions] = React.useState(true)
  const [loadingGroups, setLoadingGroups] = React.useState(false)
  const [savingGroupId, setSavingGroupId] = React.useState<string | null>(null)
  const [schedulingGroupId, setSchedulingGroupId] = React.useState<string | null>(null)
  const [scheduledDrafts, setScheduledDrafts] = React.useState<Record<string, { message: string; scheduledAt: string; recurrence: string }>>({})
  const [searchQuery, setSearchQuery] = React.useState("")

  const connectedSessions = sessions.filter(session => session.isConnected || session.status === "CONNECTED")

  const fetchSessions = React.useCallback(async () => {
    setLoadingSessions(true)
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      const list = Array.isArray(data) ? (data as SessionItem[]) : []
      setSessions(list)
      const firstConnected = list.find(session => session.isConnected || session.status === "CONNECTED")
      setSelectedSessionId(prev => prev || ensureString(firstConnected?.sessionId || list[0]?.sessionId || ""))
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement des sessions")
    } finally {
      setLoadingSessions(false)
    }
  }, [getToken])

  const fetchGroups = React.useCallback(async () => {
    if (!selectedSessionId) {
      setGroups([])
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
            return { ...group, settings: normalizeSettings(settings) }
          } catch {
            return { ...group, settings: normalizeSettings(group.settings) }
          }
        })
      )
      setGroups(enriched)
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement des groupes")
    } finally {
      setLoadingGroups(false)
    }
  }, [getToken, selectedSessionId])

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

  const updateLocalGroup = (groupId: string, patch: Partial<GroupSettings>) => {
    setGroups(prev => prev.map(group => {
      const currentId = ensureString(group.id || group.jid)
      if (currentId !== groupId) return group
      return {
        ...group,
        settings: {
          ...normalizeSettings(group.settings),
          ...patch,
        },
      }
    }))
  }

  const saveGroup = async (group: GroupItem) => {
    const groupId = ensureString(group.id || group.jid)
    if (!selectedSessionId || !groupId) return

    setSavingGroupId(groupId)
    try {
      const token = await getToken()
      await api.sessions.updateGroupSettings(selectedSessionId, groupId, toModerationPayload(group.settings), token || undefined)
      toast.success("Configuration du groupe enregistree")
    } catch (error) {
      console.error(error)
      toast.error("Impossible d'enregistrer cette configuration")
    } finally {
      setSavingGroupId(null)
    }
  }

  const scheduleDailyWelcome = async (group: GroupItem) => {
    const groupId = ensureString(group.id || group.jid)
    if (!selectedSessionId || !groupId) return

    const settings = normalizeSettings(group.settings)
    setSchedulingGroupId(groupId)
    try {
      const token = await getToken()
      await api.sessions.addEngagementTask(selectedSessionId, groupId, {
        message_content: settings.welcomeMessage,
        recurrence: "daily",
        scheduled_at: nextDailyIso(settings.welcomeDigestTime),
        type: "text"
      }, token || undefined)
      updateLocalGroup(groupId, { welcomeEnabled: true })
      toast.success("Bienvenue quotidienne programmee")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de programmer le message quotidien")
    } finally {
      setSchedulingGroupId(null)
    }
  }

  const updateScheduledDraft = (groupId: string, patch: Partial<{ message: string; scheduledAt: string; recurrence: string }>) => {
    setScheduledDrafts(prev => ({
      ...prev,
      [groupId]: {
        message: "",
        scheduledAt: defaultScheduleDateTime(),
        recurrence: "none",
        ...prev[groupId],
        ...patch,
      },
    }))
  }

  const scheduleCustomMessage = async (group: GroupItem) => {
    const groupId = ensureString(group.id || group.jid)
    if (!selectedSessionId || !groupId) return
    const draft = scheduledDrafts[groupId] || { message: "", scheduledAt: defaultScheduleDateTime(), recurrence: "none" }
    if (!draft.message.trim()) return toast.error("Ecrivez le message a programmer")
    if (!draft.scheduledAt) return toast.error("Choisissez une date et une heure")

    setSchedulingGroupId(groupId)
    try {
      const token = await getToken()
      await api.sessions.addEngagementTask(selectedSessionId, groupId, {
        message_content: draft.message,
        recurrence: draft.recurrence,
        scheduled_at: new Date(draft.scheduledAt).toISOString(),
        type: "text"
      }, token || undefined)
      setScheduledDrafts(prev => ({
        ...prev,
        [groupId]: { message: "", scheduledAt: defaultScheduleDateTime(), recurrence: draft.recurrence },
      }))
      toast.success("Message programme")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de programmer ce message")
    } finally {
      setSchedulingGroupId(null)
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
          <Badge className="border-primary/15 bg-primary/10 text-primary hover:bg-primary/10">Centre de moderation</Badge>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Shield className="h-6 w-6 text-primary" /> Groupes WhatsApp
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Une session, des groupes, des regles visibles. Configurez anti-liens, accueil et avertissements sans quitter la page.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="h-10 w-full sm:w-[260px]">
              <SelectValue placeholder="Choisir une session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(session => (
                <SelectItem key={ensureString(session.sessionId)} value={ensureString(session.sessionId)}>
                  {safeRender(session.sessionId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un groupe..."
              className="h-10 pl-9"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {ruleSummary.map(rule => (
          <Card key={rule.title} className="bg-card shadow-none">
            <CardContent className="flex gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <rule.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{rule.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{rule.text}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3">
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          Whappi applique les regles uniquement dans les groupes ou la session WhatsApp est administrateur.
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="Aucune session creee"
          text="Commencez par creer une session WhatsApp avant de configurer vos groupes."
          actionLabel="Aller au centre"
          href="/dashboard"
        />
      ) : connectedSessions.length === 0 ? (
        <EmptyState
          title="Aucune session connectee"
          text="Reconnectez une session pour lire les groupes et appliquer les regles."
          actionLabel="Voir les sessions"
          href="/dashboard"
        />
      ) : loadingGroups ? (
        <div className="grid min-h-[320px] place-items-center rounded-2xl border bg-card text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin opacity-40" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          title="Aucun groupe trouve"
          text="Ajoutez la session dans un groupe WhatsApp, donnez-lui le role admin, puis revenez ici."
          actionLabel="Actualiser"
          onClick={fetchGroups}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredGroups.map(group => {
            const groupId = ensureString(group.id || group.jid)
            const settings = normalizeSettings(group.settings)
            const activeCount = [settings.antiLinksEnabled, settings.welcomeEnabled, settings.warningsEnabled].filter(Boolean).length

            return (
              <Card key={groupId} className="overflow-hidden bg-card shadow-none">
                <CardHeader className="border-b p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{safeRender(group.subject || group.name, "Groupe sans nom")}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activeCount}/3 regles actives {group.participantCount ? `- ${safeRender(group.participantCount)} membres` : ""}
                      </p>
                    </div>
                    <Badge className={cn(
                      "shrink-0 border-none text-[10px]",
                      activeCount > 0 ? "bg-primary/10 text-primary hover:bg-primary/10" : "bg-muted text-muted-foreground"
                    )}>
                      {activeCount > 0 ? "Configure" : "A preparer"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  {(() => {
                    const scheduledDraft = scheduledDrafts[groupId] || { message: "", scheduledAt: defaultScheduleDateTime(), recurrence: "none" }
                    return (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Clock3 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Message programme</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              Planifiez une annonce, un rappel de paiement, une relance ou un message recurrent.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Textarea
                            value={scheduledDraft.message}
                            onChange={event => updateScheduledDraft(groupId, { message: event.target.value })}
                            className="min-h-20 resize-none text-xs"
                            placeholder="ex: Rappel : pensez a confirmer votre presence avant 18h."
                          />
                          <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px]">
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
                                <SelectItem value="none">Une fois</SelectItem>
                                <SelectItem value="daily">Chaque jour</SelectItem>
                                <SelectItem value="weekly">Chaque semaine</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-9 text-xs"
                              onClick={() => scheduleCustomMessage(group)}
                              disabled={schedulingGroupId === groupId}
                            >
                              {schedulingGroupId === groupId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Programmer"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                  <RuleSwitch
                    icon={<Link2 className="h-4 w-4" />}
                    title="Anti-liens"
                    text="Bloquer les liens suspects ou hors sujet."
                    checked={settings.antiLinksEnabled}
                    onCheckedChange={checked => updateLocalGroup(groupId, { antiLinksEnabled: checked })}
                  />
                  <div className="rounded-2xl border bg-background/60 p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Mots interdits</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Ajoutez les mots ou expressions a bloquer, separes par des virgules.
                        </p>
                      </div>
                    </div>
                    <Textarea
                      value={settings.forbiddenWords}
                      onChange={event => updateLocalGroup(groupId, { forbiddenWords: event.target.value })}
                      className="min-h-20 resize-none text-xs"
                      placeholder="ex: arnaque, pari, crypto rapide, lien telegram"
                    />
                  </div>
                  <RuleSwitch
                    icon={<MessageSquareText className="h-4 w-4" />}
                    title="Bienvenue quotidienne"
                    text="Envoyer un recap clair une fois par jour, en fin de journee."
                    checked={settings.welcomeEnabled}
                    onCheckedChange={checked => updateLocalGroup(groupId, { welcomeEnabled: checked })}
                  />
                  {settings.welcomeEnabled && (
                    <div className="space-y-3 rounded-2xl border bg-background/60 p-4">
                      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                        <Textarea
                          value={settings.welcomeMessage}
                          onChange={event => updateLocalGroup(groupId, { welcomeMessage: event.target.value })}
                          className="min-h-24 resize-none text-xs"
                          placeholder="Message de bienvenue"
                        />
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Heure d&apos;envoi
                          </label>
                          <Input
                            type="time"
                            value={settings.welcomeDigestTime}
                            onChange={event => updateLocalGroup(groupId, { welcomeDigestTime: event.target.value })}
                            className="h-10 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-full text-xs"
                            onClick={() => scheduleDailyWelcome(group)}
                            disabled={schedulingGroupId === groupId}
                          >
                            {schedulingGroupId === groupId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-3.5 w-3.5" />}
                            Programmer
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <RuleSwitch
                    icon={<AlertTriangle className="h-4 w-4" />}
                    title="Avertissement avant sanction"
                    text="Garder une moderation transparente avant exclusion."
                    checked={settings.warningsEnabled}
                    onCheckedChange={checked => updateLocalGroup(groupId, { warningsEnabled: checked })}
                  />
                  {settings.warningsEnabled && (
                    <Textarea
                      value={settings.warningMessage}
                      onChange={event => updateLocalGroup(groupId, { warningMessage: event.target.value })}
                      className="min-h-20 resize-none text-xs"
                      placeholder="Message d'avertissement"
                    />
                  )}

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Configuration visible sur une seule page
                    </div>
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={() => saveGroup(group)}
                      disabled={savingGroupId === groupId}
                    >
                      {savingGroupId === groupId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function normalizeSettings(settings?: GroupSettings | null): Required<Pick<GroupSettings, "antiLinksEnabled" | "welcomeEnabled" | "warningsEnabled" | "welcomeMessage" | "warningMessage" | "forbiddenWords" | "welcomeDigestTime">> {
  return {
    antiLinksEnabled: Boolean(settings?.antiLinksEnabled ?? settings?.anti_links_enabled ?? settings?.antiLinkEnabled),
    welcomeEnabled: Boolean(settings?.welcomeEnabled ?? settings?.welcome_digest_enabled ?? settings?.welcome_enabled),
    warningsEnabled: Boolean(settings?.warningsEnabled ?? settings?.warnings_enabled),
    welcomeMessage: ensureString(settings?.welcomeMessage ?? settings?.welcome_message, defaultWelcomeMessage),
    warningMessage: ensureString(settings?.warningMessage ?? settings?.warning_message, defaultWarningMessage),
    forbiddenWords: ensureString(settings?.forbiddenWords ?? settings?.bad_words ?? settings?.banned_words, ""),
    welcomeDigestTime: ensureString(settings?.welcomeDigestTime ?? settings?.welcome_digest_time, "18:00"),
  }
}

function toModerationPayload(settings?: GroupSettings | null) {
  const normalized = normalizeSettings(settings)
  return {
    is_active: normalized.antiLinksEnabled || normalized.welcomeEnabled || normalized.warningsEnabled || Boolean(normalized.forbiddenWords.trim()),
    anti_link: normalized.antiLinksEnabled,
    bad_words: normalized.forbiddenWords,
    warning_template: normalized.warningMessage,
    max_warnings: 3,
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

function RuleSwitch({
  icon,
  title,
  text,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode
  title: string
  text: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-background/60 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
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
