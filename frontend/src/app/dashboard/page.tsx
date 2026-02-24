"use client"

import * as React from "react"
import { Plus, Zap, Activity } from "lucide-react"
import { SessionCard } from "@/components/dashboard/session-card"
import { MessagingTabs } from "@/components/dashboard/messaging-tabs"
import { LogViewer } from "@/components/dashboard/log-viewer"
import { CreditCardUI } from "@/components/dashboard/credit-card-ui"
import { api } from "@/lib/api"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useWebSocket } from "@/providers/websocket-provider"
import { useUser, useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useNotificationSound } from "@/hooks/use-notification-sound"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const sessionSchema = z.object({
  sessionId: z.string().min(3, "L'ID de session doit comporter au moins 3 caractères").regex(/^[a-z0-9-]+$/, "Seuls les minuscules, les chiffres et les traits d'union sont autorisés"),
  phoneNumber: z.string().optional(),
})

export default function DashboardPage() {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [recentActivities, setRecentActivities] = React.useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = React.useState(true)
  const [summary, setSummary] = React.useState({ totalActivities: 0, successRate: 0, activeSessions: 0, messagesSent: 0 })
  const [credits, setCredits] = React.useState<any>(null)
  const [dbUser, setDbUser] = React.useState<any>(null)
  const [userRole, setUserRole] = React.useState<string | null>(null)

  const { isLoaded, user } = useUser()
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()
  const { play: playNotificationSound } = useNotificationSound()

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { sessionId: "", phoneNumber: "" }
  })

  React.useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress
      let role = (user.publicMetadata?.role as string) || "user"
      if (email?.toLowerCase() === 'maruise237@gmail.com') role = 'admin'
      setUserRole(role)
    }
  }, [isLoaded, user])

  const fetchSessions = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
      if (data?.length > 0 && !selectedSessionId) setSelectedSessionId(data[0].sessionId)
    } catch (e) {} finally { setLoading(false) }
  }, [getToken, selectedSessionId])

  const fetchRecentActivities = React.useCallback(async () => {
    setActivitiesLoading(true)
    try {
      const token = await getToken()
      const [list, summ] = await Promise.all([
        api.activities.list(token || undefined),
        api.activities.summary(7, token || undefined)
      ])
      setRecentActivities(Array.isArray(list) ? list.slice(0, 5) : [])
      setSummary(prev => ({
        ...prev,
        totalActivities: summ?.totalActivities || 0,
        successRate: summ?.successRate || 0,
        messagesSent: summ?.byAction?.send_message || 0
      }))
    } catch (e) {} finally { setActivitiesLoading(false) }
  }, [getToken])

  const fetchCredits = React.useCallback(async () => {
    try {
      const token = await getToken()
      const response = await api.credits.get(token || undefined)
      setCredits(response?.data || response)
    } catch (e) {
      console.error("Fetch credits error:", e)
    }
  }, [getToken])

  const fetchDbUser = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.users.getProfile(token || undefined)
      setDbUser(data)
    } catch (e) {}
  }, [getToken])

  // Update activeSessions whenever sessions changes
  React.useEffect(() => {
    setSummary(prev => ({
      ...prev,
      activeSessions: Array.isArray(sessions) ? sessions.filter(s => s?.isConnected).length : 0
    }))
  }, [sessions])

  React.useEffect(() => {
    fetchSessions()
    fetchRecentActivities()
    fetchCredits()
    fetchDbUser()

    const interval = setInterval(() => {
      fetchSessions()
      fetchRecentActivities()
      fetchCredits()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchSessions, fetchRecentActivities, fetchCredits, fetchDbUser])

  // Handle real-time updates
  React.useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'session-update') {
      const updates = Array.isArray(lastMessage.data) ? lastMessage.data : (lastMessage.data ? [lastMessage.data] : [])
      setSessions(prev => {
        const currentSessions = Array.isArray(prev) ? prev : []
        const sessionsMap = new Map(currentSessions.map(s => [s.sessionId, s]));
        let changed = false;

        updates.forEach((update: any) => {
          if (!update || !update.sessionId) return;
          const existing = sessionsMap.get(update.sessionId);
          if (existing) {
            const oldStatus = existing.isConnected;
            const newStatus = update.isConnected;

            if (!oldStatus && newStatus) {
              toast.success(`Session ${update.sessionId} connectée avec succès !`);
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#34d399', '#6ee7b7', '#ffffff']
              });
            }

            sessionsMap.set(update.sessionId, { ...existing, ...update });
            changed = true;
          } else {
            sessionsMap.set(update.sessionId, update);
            changed = true;
          }
        });

        return changed ? Array.from(sessionsMap.values()) : prev;
      });
    } else if (lastMessage.type === 'message_received') {
      // Play sound for incoming message if enabled (default to true)
      if (dbUser?.sound_notifications !== 0) {
        playNotificationSound()
      }
    } else if (lastMessage.type === 'session-deleted') {
      const { sessionId } = lastMessage.data
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId))
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null)
      }
    }
  }, [lastMessage, selectedSessionId])

  const onCreateSession = async (values: z.infer<typeof sessionSchema>) => {
    const t = toast.loading("Création de la session...")
    try {
      const token = await getToken()
      await api.sessions.create(values.sessionId, values.phoneNumber || undefined, token || undefined)
      toast.success("Session créée !", { id: t })
      setIsCreateOpen(false)
      form.reset()
      fetchSessions()
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    } catch (e) { toast.error("Échec de la création", { id: t }) }
  }

  const selectedSession = Array.isArray(sessions) ? sessions.find(s => s && s.sessionId === selectedSessionId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Vue d&apos;ensemble</h1>
          <p className="text-sm text-muted-foreground">Gérez vos sessions et surveillez l&apos;activité.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sessions totales" value={sessions.length} />
        <StatCard label="Taux de succès" value={`${summary.successRate}%`} />
        <StatCard label="Messages envoyés" value={summary.messagesSent} />
        {userRole === 'admin' && <StatCard label="Activités Système" value={summary.totalActivities} />}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedSessionId || ""} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="flex-1 sm:w-48 h-9 text-xs">
              <SelectValue placeholder="Sélectionner une session" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(sessions) && sessions.length > 0 ? (
                sessions.map((s) => (
                  <SelectItem key={s?.sessionId || Math.random()} value={s?.sessionId || "unknown"} className="text-xs">
                    {s?.sessionId || "Inconnu"}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>Aucune session</SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedSession && (
            <Badge className={cn(
              "text-[10px] px-2 h-6 font-medium whitespace-nowrap",
              selectedSession.isConnected
                ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                : "bg-muted text-muted-foreground"
            )}>
              {selectedSession.isConnected ? "Connecté" : "Hors ligne"}
            </Badge>
          )}
        </div>
        <Button size="sm" className="w-full sm:w-auto h-9" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Session
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <SessionCard session={selectedSession} onRefresh={fetchSessions} onCreate={() => setIsCreateOpen(true)} />
          <MessagingTabs session={selectedSession} sessions={sessions} onSessionChange={setSelectedSessionId} />
          {userRole === 'admin' && <LogViewer />}
        </div>
        <div className="lg:col-span-4 space-y-6">
          {userRole === 'admin' && <ActivityCard activities={recentActivities} loading={activitiesLoading} />}
          <CreditCardUI credits={credits} userRole={userRole} />
        </div>
      </div>

      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSession)} className="space-y-6">
              <SheetHeader>
                <SheetTitle>Nouvelle Session WhatsApp</SheetTitle>
                <SheetDescription>Créez une nouvelle instance pour commencer à envoyer des messages.</SheetDescription>
              </SheetHeader>

              <div className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase">Identifiant de session</FormLabel>
                      <FormControl><Input placeholder="ex: departement-marketing" {...field} className="h-9" /></FormControl>
                      <FormMessage className="text-[10px]" />
                      <div className="flex flex-wrap gap-2 pt-1">
                        {['marketing', 'support', 'alertes'].map(s => (
                          <button key={s} type="button" onClick={() => field.onChange(`${s}-${Math.floor(Math.random()*900)+100}`)} className="text-[10px] px-2 py-1 rounded bg-muted hover:bg-primary/10 transition-colors">+ {s}</button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase">Numéro de téléphone (Optionnel)</FormLabel>
                      <FormControl><Input placeholder="237..." {...field} className="h-9" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              <SheetFooter>
                <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Création..." : "Créer la session"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

function ActivityCard({ activities, loading }: { activities: any[]; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <p className="text-sm font-medium">Activités en direct</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {loading ? (
            <div className="p-4 text-xs text-muted-foreground">Chargement...</div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-xs text-muted-foreground">Aucune activité récente</p>
            </div>
          ) : (
            activities.map((a, i) => (
              <div key={i} className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{String(a?.action || 'Action').replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a?.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Heure inconnue'}
                  </p>
                </div>
                <Badge variant={a?.success ? "default" : "destructive"} className="text-[9px] h-4">
                  {a?.success ? "OK" : "ERR"}
                </Badge>
              </div>
            ))
          )}
        </div>
        <Link href="/dashboard/activities" className="block w-full p-2 text-center text-[10px] font-medium text-muted-foreground hover:text-foreground border-t">
          Voir tout l&apos;historique
        </Link>
      </CardContent>
    </Card>
  )
}
