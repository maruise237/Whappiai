"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth, useUser } from "@clerk/clerk-react"
import confetti from "canvas-confetti"
import {
  ArrowRight,
  History,
  Link2,
  MessageCircle,
  Plus,
  ShieldCheck,
  Smartphone,
  Users,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { cn, ensureString, safeDate, safeRender } from "@/lib/utils"
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

type AnalyticsPoint = {
  date?: string
  messages?: number
}

const sessionSchema = z.object({
  sessionId: z
    .string()
    .min(3, "L'ID de session doit comporter au moins 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "Minuscules, chiffres et traits d'union uniquement"),
  phoneNumber: z.string().optional(),
})

export default function DashboardPage() {
  const { isLoaded, user } = useUser()
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()
  const lastProcessedMessageRef = React.useRef("")

  const [sessions, setSessions] = React.useState<SessionItem[]>([])
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
  const [recentActivities, setRecentActivities] = React.useState<ActivityItem[]>([])
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsPoint[]>([])

  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const isAdmin = userEmail === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

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
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [fetchSummaryData, getToken])

  React.useEffect(() => {
    if (isLoaded && user) {
      fetchSessions(true)
    }
  }, [fetchSessions, isLoaded, user])

  React.useEffect(() => {
    if (!lastMessage) return
    const messageStr = JSON.stringify(lastMessage)
    if (messageStr === lastProcessedMessageRef.current) return
    lastProcessedMessageRef.current = messageStr

    if (lastMessage.type === "session-update") {
      const updates = Array.isArray(lastMessage.data) ? lastMessage.data : [lastMessage.data]
      let needsRefresh = false

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

      updates.forEach((update: SessionItem) => {
        if (!update) return
        if (update.status === "CONNECTED") {
          toast.success(`Session ${update.sessionId} connectee`)
          confetti()
        } else if (update.status === "GENERATING_CODE" && update.pairingCode) {
          toast.info(`Code d'appairage recu pour ${update.sessionId}`)
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
  }, [fetchSessions, lastMessage, selectedSessionId])

  const selectedSession = sessions.find(s => ensureString(s.sessionId) === ensureString(selectedSessionId))

  if (!isLoaded || loading) {
    return (
      <div className="grid min-h-[70dvh] place-items-center text-zinc-500">
        Chargement du centre Whappi...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="overflow-hidden rounded-[28px] border bg-card shadow-[0_30px_80px_-55px_hsl(var(--primary))]">
          <div className="border-b p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge className="border-primary/15 bg-primary/10 text-primary hover:bg-primary/10">
                  Nouveau centre de controle
                </Badge>
                <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Pilotez vos groupes sans rester colle a WhatsApp.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Whappi fonctionne comme un co-admin : une session connectee, un groupe administre, une regle activee, puis une verification claire.
                </p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="h-10 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle session
              </Button>
            </div>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-4">
            <MetricTile label="Sessions" value={sessions.length} sub={`${summary.activeSessions} connectee(s)`} />
            <MetricTile label="Messages" value={summary.messagesSent} sub="Volume suivi" />
            <MetricTile label="Reussite" value={`${summary.successRate}%`} sub="Derniers 7 jours" />
            <MetricTile label="Actions" value={summary.totalActivities} sub="Activite recente" />
          </div>
        </div>

        <Card className="rounded-[28px] bg-card shadow-none">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Parcours de prise en main</p>
                <p className="mt-1 text-xs text-muted-foreground">Aucun vieux panneau technique ici.</p>
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">4 etapes</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["01", "Connecter une session", "QR code ou code d'appairage"],
                ["02", "Ajouter au groupe", "Le numero doit etre admin"],
                ["03", "Activer une regle", "Anti-liens ou bienvenue"],
                ["04", "Verifier les actions", "Voir ce qui a ete applique"],
              ].map(([step, title, text]) => (
                <div key={step} className="flex gap-3 rounded-2xl border bg-background/60 p-3">
                  <span className="font-mono text-[11px] text-primary">{step}</span>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{text}</p>
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

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-[28px] bg-card shadow-none">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Session de travail</p>
                <p className="mt-1 text-xs text-muted-foreground">Selectionnez le numero qui va administrer vos groupes.</p>
              </div>
              <Select value={selectedSessionId || ""} onValueChange={value => setSelectedSessionId(ensureString(value))}>
                <SelectTrigger className="h-10 text-xs md:w-[220px]">
                  <SelectValue placeholder="Choisir une session" />
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
                <p className="text-sm font-semibold">Regles rapides</p>
                <p className="mt-1 text-xs text-muted-foreground">Les vraies actions a configurer en premier.</p>
              </div>
              <Button asChild variant="outline" className="h-9 text-xs">
                <Link href="/dashboard/moderation">
                  Ouvrir
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3">
              <RuleRow icon={<Link2 className="h-4 w-4" />} title="Anti-liens" text="Bloquer pubs, arnaques et liens hors sujet." />
              <RuleRow icon={<MessageCircle className="h-4 w-4" />} title="Bienvenue" text="Envoyer les regles quand un membre arrive." />
              <RuleRow icon={<ShieldCheck className="h-4 w-4" />} title="Avertissements" text="Prevenir avant exclusion pour garder le groupe calme." />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {isAdmin ? (
          <AdminPanel adminStats={adminStats} analyticsData={analyticsData} recentActivities={recentActivities} />
        ) : (
          <UserActivityPanel recentActivities={recentActivities} />
        )}
        <NextBestActionPanel sessionCount={sessions.length} activeSessions={summary.activeSessions} />
      </section>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(async value => {
                const toastId = toast.loading("Creation de la session...")
                try {
                  const token = await getToken()
                  await api.sessions.create(value.sessionId, value.phoneNumber, token || undefined)
                  toast.success("Session prete", { id: toastId })
                  setIsCreateOpen(false)
                  fetchSessions(true)
                  confetti()
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Erreur de creation"
                  toast.error(message, { id: toastId })
                }
              })}
              className="space-y-6"
            >
              <DialogHeader>
                <DialogTitle>Nouvelle session WhatsApp</DialogTitle>
                <DialogDescription>
                  Choisissez un nom simple pour le numero qui servira de co-admin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de session</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: tontine-douala" {...field} />
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
                      <FormLabel>Numero dedie (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: 2376..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  Creer la session
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
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

function RuleRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-background/60 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

function FirstRunPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="rounded-[28px] border-primary/30 bg-primary/10 shadow-none">
      <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">Premiere activation</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Creez une session, puis testez dans un groupe reel.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Le but n&apos;est pas de remplir des formulaires. Le but est de connecter un numero, le promouvoir admin, puis activer une premiere regle.
          </p>
        </div>
        <Button onClick={onCreate} className="h-11 rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Demarrer
        </Button>
      </CardContent>
    </Card>
  )
}

function UserActivityPanel({ recentActivities }: { recentActivities: ActivityItem[] }) {
  return (
    <Card className="rounded-[28px] border-white/10 bg-[#151514] text-zinc-100 shadow-none">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Dernieres actions</p>
            <p className="mt-1 text-xs text-zinc-500">Vue limitee aux actions de vos sessions.</p>
          </div>
          <History className="h-4 w-4 text-zinc-500" />
        </div>
        <div className="space-y-3">
          {recentActivities.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">
              Aucune action recente. Activez une regle pour voir Whappi travailler.
            </p>
          ) : (
            recentActivities.slice(0, 5).map(activity => (
              <div key={ensureString(activity.id || activity.timestamp)} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-zinc-200">{ensureString(activity.action, "Action").replace(/_/g, " ")}</p>
                  <p className="mt-1 truncate text-[11px] text-zinc-500">{safeRender(activity.resource_id || activity.details || "Session")}</p>
                </div>
                <Badge className={cn(
                  "border-none text-[10px]",
                  activity.success === 1 || activity.success === true
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-red-500/10 text-red-300"
                )}>
                  {activity.success === 1 || activity.success === true ? "OK" : "Erreur"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AdminPanel({
  adminStats,
  analyticsData,
  recentActivities,
}: {
  adminStats: AdminStats | null
  analyticsData: AnalyticsPoint[]
  recentActivities: ActivityItem[]
}) {
  return (
    <Card className="rounded-[28px] border-white/10 bg-[#151514] text-zinc-100 shadow-none">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Admin plateforme</p>
            <p className="mt-1 text-xs text-zinc-500">Visible uniquement pour les comptes admin.</p>
          </div>
          <Button asChild variant="outline" className="h-9 border-white/10 bg-white/[0.03] text-xs text-zinc-100 hover:bg-white/[0.07]">
            <Link href="/dashboard/users">Utilisateurs</Link>
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MiniAdminStat icon={<Users className="h-4 w-4" />} label="Utilisateurs" value={adminStats?.users?.total || 0} />
          <MiniAdminStat icon={<Smartphone className="h-4 w-4" />} label="Sessions" value={adminStats?.sessions?.total || 0} />
          <MiniAdminStat icon={<ShieldCheck className="h-4 w-4" />} label="Actions" value={adminStats?.operations?.applied || 0} />
        </div>

        <div className="mt-5 h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analyticsData}>
              <defs>
                <linearGradient id="adminMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "#fff" }} />
              <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#adminMessages)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-5 grid gap-2">
          {recentActivities.slice(0, 3).map(activity => (
            <div key={ensureString(activity.id || activity.timestamp)} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
              <span className="truncate text-xs text-zinc-400">{safeRender(activity.action, "Action")}</span>
              <span className="font-mono text-[10px] text-zinc-600">{safeDate(activity.created_at || activity.timestamp)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function NextBestActionPanel({ sessionCount, activeSessions }: { sessionCount: number; activeSessions: number }) {
  const steps = [
    { label: "Session", done: sessionCount > 0 },
    { label: "Connexion", done: activeSessions > 0 },
    { label: "Groupe", done: false },
    { label: "Regle", done: false },
  ]

  return (
    <Card className="bg-card shadow-none">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold">Prochaine action utile</p>
          <p className="mt-1 text-xs text-muted-foreground">Le centre garde le cap sur l&apos;activation, pas sur une ancienne logique de solde.</p>
        </div>
        <div className="space-y-3">
          {steps.map(step => (
            <div key={step.label} className="flex items-center justify-between rounded-2xl border bg-background/60 p-3">
              <span className="text-sm font-medium">{step.label}</span>
              <Badge className={step.done ? "bg-primary/10 text-primary hover:bg-primary/10" : "bg-muted text-muted-foreground"}>
                {step.done ? "OK" : "A faire"}
              </Badge>
            </div>
          ))}
        </div>
        <Button asChild className="mt-5 w-full" size="sm">
          <Link href="/dashboard/moderation">Configurer les groupes</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function MiniAdminStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-primary">{icon}</div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}
