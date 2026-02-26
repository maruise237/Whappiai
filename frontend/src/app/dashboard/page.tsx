"use client"

import * as React from "react"
import { Plus, Zap, Activity, MessageCircle, Smartphone, Brain, Sparkles, Loader2, ArrowRight } from "lucide-react"
import { SessionCard } from "@/components/dashboard/session-card"
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
import { Separator } from "@/components/ui/separator"
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
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Pilotage Hub */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Pilotage Whappi</h1>
          <p className="text-xs text-muted-foreground">Gérez vos automatisations en un coup d&apos;œil.</p>
        </div>
        <Button size="sm" id="new-session-btn" onClick={() => setIsCreateOpen(true)} className="rounded-full h-8 px-4">
           <Plus className="h-3 w-3 mr-2" /> Session
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Messages" value={summary.messagesSent} />
        <StatCard label="Succès" value={`${summary.successRate}%`} />
        <StatCard label="Crédits" value={credits?.balance || 0} />
        <StatCard label="Sessions" value={sessions.length} />
      </div>

      <div className="grid grid-cols-1 gap-6">
         {/* Active Session Control */}
         <Card className="border-none shadow-none bg-muted/20">
            <div className="p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Smartphone className="h-4 w-4 text-primary" /></div>
                  <Select value={selectedSessionId || ""} onValueChange={setSelectedSessionId}>
                     <SelectTrigger className="w-[160px] h-8 text-[11px] bg-background border-none shadow-sm">
                        <SelectValue placeholder="Choisir une session" />
                     </SelectTrigger>
                     <SelectContent>
                        {sessions.map(s => <SelectItem key={s.sessionId} value={s.sessionId} className="text-xs">{s.sessionId}</SelectItem>)}
                     </SelectContent>
                  </Select>
               </div>
               {selectedSessionAI && (
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-background rounded-full shadow-sm">
                     <span className="text-[10px] font-bold uppercase text-muted-foreground">IA {selectedSessionAI.enabled ? "Active" : "Pause"}</span>
                     <Switch size="sm" checked={!!selectedSessionAI.enabled} onCheckedChange={toggleAI} disabled={isAiLoading} />
                  </div>
               )}
            </div>
            <CardContent className="px-4 pb-4">
               <SessionCard session={selectedSession} onRefresh={fetchSessions} onCreate={() => setIsCreateOpen(true)} />
            </CardContent>
         </Card>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-muted/10">
               <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                     <Zap className="h-3 w-3 text-primary" /> Intelligence Rapide
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="p-3 rounded bg-background border border-border/50">
                     <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Prompt Actuel</p>
                     <p className="text-[11px] line-clamp-3 italic text-muted-foreground">
                        {selectedSessionAI?.prompt || "Aucun prompt configuré."}
                     </p>
                  </div>
                  <Button variant="link" size="sm" className="p-0 h-auto text-[11px] font-bold" asChild>
                     <Link href="/dashboard/ai">Modifier les réglages intelligence →</Link>
                  </Button>
               </CardContent>
            </Card>

            <CreditCardUI credits={credits} userRole={userRole} />
         </div>
      </div>

      {/* Sheet remains the same */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(async (val) => {
               const t = toast.loading("Création...");
               try {
                 const token = await getToken();
                 await api.sessions.create(val.sessionId, val.phoneNumber, token || undefined);
                 toast.success("Session prête", { id: t });
                 setIsCreateOpen(false);
                 fetchSessions();
                 confetti();
               } catch (e) {
                 toast.error("Erreur de création", { id: t });
               }
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
