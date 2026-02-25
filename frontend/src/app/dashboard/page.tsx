"use client"

import * as React from "react"
import { Plus, Zap, Activity, MessageCircle, Smartphone, Brain, Sparkles, Loader2, ArrowRight } from "lucide-react"
import { SessionCard } from "@/components/dashboard/session-card"
import { CreditCardUI } from "@/components/dashboard/credit-card-ui"
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { useI18n } from "@/i18n/i18n-provider"

const sessionSchema = z.object({
  sessionId: z.string().min(3, "L'ID de session doit comporter au moins 3 caractères").regex(/^[a-z0-9-]+$/, "Seuls les minuscules, les chiffres et les traits d'union sont autorisés"),
  phoneNumber: z.string().optional(),
})

export default function DashboardPage() {
  const { t } = useI18n()
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [summary, setSummary] = React.useState({ totalActivities: 0, successRate: 0, activeSessions: 0, messagesSent: 0 })
  const [credits, setCredits] = React.useState<any>(null)
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const [selectedSessionAI, setSelectedSessionAI] = React.useState<any>(null)
  const [isAiLoading, setIsAiLoading] = React.useState(false)

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

  const fetchSummary = React.useCallback(async () => {
    try {
      const token = await getToken()
      const summ = await api.activities.summary(7, token || undefined)
      setSummary(prev => ({
        ...prev,
        totalActivities: summ?.totalActivities || 0,
        successRate: summ?.successRate || 0,
        messagesSent: summ?.byAction?.send_message || 0
      }))
    } catch (e) {}
  }, [getToken])

  const fetchCredits = React.useCallback(async () => {
    try {
      const token = await getToken()
      const response = await api.credits.get(token || undefined)
      setCredits(response?.data || response)
    } catch (e) {}
  }, [getToken])

  const fetchAI = React.useCallback(async () => {
     if (!selectedSessionId) return
     setIsAiLoading(true)
     try {
       const token = await getToken()
       const ai = await api.sessions.getAI(selectedSessionId, token || undefined)
       setSelectedSessionAI(ai)
     } catch (e) {} finally { setIsAiLoading(false) }
  }, [getToken, selectedSessionId])

  React.useEffect(() => {
    fetchSessions()
    fetchSummary()
    fetchCredits()
  }, [fetchSessions, fetchSummary, fetchCredits])

  React.useEffect(() => {
    if (selectedSessionId) fetchAI()
  }, [selectedSessionId, fetchAI])

  // Handle real-time updates
  React.useEffect(() => {
    if (!lastMessage) return
    if (lastMessage.type === 'session-update') {
      fetchSessions()
    }
  }, [lastMessage])

  const toggleAI = async () => {
     if (!selectedSessionId || !selectedSessionAI) return
     try {
        const token = await getToken()
        const newVal = !selectedSessionAI.enabled
        await api.sessions.updateAI(selectedSessionId, { ...selectedSessionAI, enabled: newVal }, token || undefined)
        setSelectedSessionAI({ ...selectedSessionAI, enabled: newVal })
        toast.success(`IA ${newVal ? 'activée' : 'désactivée'}`)
     } catch (e) {
        toast.error("Échec du basculement")
     }
  }

  const selectedSession = Array.isArray(sessions) ? sessions.find(s => s && s.sessionId === selectedSessionId) : null

  if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Welcome & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Bonjour, {user?.firstName || 'utilisateur'}</h1>
          <p className="text-sm text-muted-foreground">Voici l&apos;état de votre automatisation aujourd&apos;hui.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex -space-x-2 mr-2">
              <div className="h-8 w-8 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center"><Smartphone className="h-4 w-4 text-primary" /></div>
              <div className="h-8 w-8 rounded-full border-2 border-background bg-green-500/10 flex items-center justify-center"><Brain className="h-4 w-4 text-green-600" /></div>
           </div>
           <Button size="sm" id="new-session-btn" onClick={() => setIsCreateOpen(true)} className="rounded-full shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" /> Nouvelle Session
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Messages" value={summary.messagesSent} />
        <StatCard label="Taux de Succès" value={`${summary.successRate}%`} />
        <StatCard label="Crédits" value={credits?.balance || 0} />
        <StatCard label="Sessions" value={sessions.length} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8">
        {/* Main Status Area */}
        <div className="space-y-8">
           <Card className="border-none shadow-none bg-transparent">
              <div className="flex items-center justify-between mb-4 px-2">
                 <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Pilotage en direct</h2>
                 <Select value={selectedSessionId || ""} onValueChange={setSelectedSessionId}>
                    <SelectTrigger className="w-[180px] h-8 text-[11px] bg-background">
                       <SelectValue placeholder="Choisir une session" />
                    </SelectTrigger>
                    <SelectContent>
                       {sessions.map(s => <SelectItem key={s.sessionId} value={s.sessionId} className="text-xs">{s.sessionId}</SelectItem>)}
                    </SelectContent>
                 </Select>
              </div>
              <SessionCard session={selectedSession} onRefresh={fetchSessions} onCreate={() => setIsCreateOpen(true)} />
           </Card>

           <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-2">Performance</h2>
              <Card><CardContent className="p-6"><AnalyticsCharts /></CardContent></Card>
           </div>
        </div>

        {/* Quick Controls Sidebar */}
        <div className="space-y-8">
           {/* IA Quick Toggle */}
           <Card className={cn(
              "border-2 transition-all",
              selectedSessionAI?.enabled ? "border-primary/20 bg-primary/[0.02]" : "border-muted"
           )}>
              <CardHeader className="pb-3">
                 <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                       <Brain className={cn("h-4 w-4", selectedSessionAI?.enabled ? "text-primary" : "text-muted-foreground")} />
                       Assistant IA
                    </CardTitle>
                    <Switch checked={!!selectedSessionAI?.enabled} onCheckedChange={toggleAI} disabled={!selectedSessionId || isAiLoading} />
                 </div>
                 <CardDescription className="text-[11px]">
                    {selectedSessionAI?.enabled ? "Le cerveau IA répond à vos messages." : "L'IA est actuellement en veille."}
                 </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                 <div className="rounded-lg bg-muted/50 p-3 mb-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Instruction Actuelle</p>
                    <p className="text-[11px] line-clamp-2 italic text-muted-foreground">
                       {selectedSessionAI?.prompt || "Aucune instruction configurée."}
                    </p>
                 </div>
                 <Button variant="outline" size="sm" className="w-full h-8 text-[11px]" asChild>
                    <Link href="/dashboard/ai">Gérer l&apos;Intelligence <ArrowRight className="ml-2 h-3 w-3" /></Link>
                 </Button>
              </CardContent>
           </Card>

           <CreditCardUI credits={credits} userRole={userRole} />

           <Card className="bg-muted/30 border-none">
              <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Astuce MicroSaaS
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Utilisez les **Réponses par Mots-clés** dans l&apos;onglet Intelligence pour répondre aux questions simples et économiser vos crédits IA.
                 </p>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Sheet remains the same */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(val => {
               const t = toast.loading("Création...");
               api.sessions.create(val.sessionId, val.phoneNumber, getToken() as any).then(() => {
                  toast.success("Session prête", { id: t });
                  setIsCreateOpen(false);
                  fetchSessions();
                  confetti();
               }).catch(() => toast.error("Erreur", { id: t }));
            })} className="space-y-6">
              <SheetHeader>
                <SheetTitle>Nouvelle Session</SheetTitle>
                <SheetDescription>Couplez un nouveau compte WhatsApp.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <FormField control={form.control} name="sessionId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase">Nom de session</FormLabel>
                      <FormControl><Input placeholder="ex: support-client" {...field} className="h-9" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase">Téléphone (Optionnel)</FormLabel>
                      <FormControl><Input placeholder="237..." {...field} className="h-9" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
              <SheetFooter><Button type="submit">Lancer la création</Button></SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="border-none bg-muted/20 shadow-none">
      <CardContent className="p-4">
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
