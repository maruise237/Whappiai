"use client"

import * as React from "react"
import {
  Plus,
  Zap,
  Activity,
  MessageCircle,
  Smartphone,
  Brain,
  Sparkles,
  Loader2,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  History,
  Settings2,
  LogOut,
  CreditCard,
  User,
  MoreVertical,
  Bot
} from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { useRouter } from "next/navigation"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const sessionSchema = z.object({
  sessionId: z.string().min(3, "L'ID de session doit comporter au moins 3 caractères").regex(/^[a-z0-9-]+$/, "Seuls les minuscules, les chiffres et les traits d-union sont autorisés"),
  phoneNumber: z.string().optional(),
})

export default function DashboardPage() {
  const router = useRouter()
  const { isLoaded, user } = useUser()
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()

  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [summary, setSummary] = React.useState({ totalActivities: 0, successRate: 0, activeSessions: 0, messagesSent: 0 })
  const [adminStats, setAdminStats] = React.useState<any>(null)
  const [credits, setCredits] = React.useState<any>(null)
  const [recentActivities, setRecentActivities] = React.useState<any[]>([])
  const [analyticsData, setAnalyticsData] = React.useState<any[]>([])

  const isAdmin = user?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { sessionId: "", phoneNumber: "" }
  })

  const fetchSessions = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
      if (data && data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].sessionId)
      }
    } catch (e) {} finally {
      setLoading(false)
    }
  }, [getToken, selectedSessionId])

  const fetchSummary = React.useCallback(async () => {
    try {
      const token = await getToken()

      if (isAdmin) {
        const [stats, analytics] = await Promise.all([
            api.admin.getStats(7, token || undefined),
            api.activities.analytics(7, token || undefined)
        ])
        setAdminStats(stats)
        setAnalyticsData(analytics || [])
        setSummary({
            totalActivities: stats?.overview?.activities || 0,
            successRate: stats?.overview?.successRate || 0,
            messagesSent: stats?.overview?.messagesSent || 0,
            activeSessions: stats?.sessions?.connected || 0
        })
      } else {
        const summ = await api.activities.summary(7, token || undefined)
        setSummary({
          totalActivities: summ?.totalActivities || 0,
          successRate: summ?.successRate || 0,
          messagesSent: summ?.byAction?.send_message || 0,
          activeSessions: sessions.filter(s => s.isConnected).length
        })
      }

      const logs = await api.activities.list(5, 0, token || undefined)
      setRecentActivities(logs || [])
    } catch (e) {}
  }, [getToken, sessions, isAdmin])

  const fetchCredits = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.credits.get(token || undefined)
      setCredits(data?.data || data)
    } catch (e) {}
  }, [getToken])

  React.useEffect(() => {
    fetchSessions()
    fetchCredits()
  }, [fetchSessions, fetchCredits])

  React.useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId)

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement...</div>

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Gérez vos automatisations et surveillez les performances.</p>
        </div>
      </div>

      {/* Grid 4 cols Stats */}
      <div id="performance-charts" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin ? (
            <>
                <StatCard label="Utilisateurs" value={adminStats?.users?.total || 0} subtext={`${adminStats?.users?.active || 0} actifs`} />
                <StatCard label="Sessions Globales" value={adminStats?.sessions?.total || 0} subtext={`${adminStats?.sessions?.connected || 0} connectées`} />
                <StatCard label="Messages Plateforme" value={adminStats?.overview?.messagesSent || 0} subtext="Total envoyé" />
                <StatCard label="Consommation Crédits" value={adminStats?.credits?.deducted || 0} subtext="Volume global" />
            </>
        ) : (
            <>
                <StatCard label="Sessions" value={sessions.length} subtext={`${summary.activeSessions} actives`} />
                <StatCard label="Taux de Succès" value={`${summary.successRate}%`} subtext="Derniers 7 jours" />
                <StatCard label="Messages Envoyés" value={summary.messagesSent} subtext="Total cumulé" />
                <StatCard label="Activités" value={summary.totalActivities} subtext="Dernières 24h" />
            </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card shadow-sm">
         <div className="flex items-center gap-4">
            <Select value={selectedSessionId || ""} onValueChange={setSelectedSessionId}>
               <SelectTrigger className="w-[180px] h-9 text-xs bg-muted/50 border-none">
                  <SelectValue placeholder="Choisir une session" />
               </SelectTrigger>
               <SelectContent>
                  {sessions.map(s => <SelectItem key={s.sessionId} value={s.sessionId} className="text-xs">{s.sessionId}</SelectItem>)}
               </SelectContent>
            </Select>
            {selectedSession && (
               <Badge className={cn(
                  "text-[9px] font-semibold border-none px-2 h-5",
                  selectedSession.isConnected
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
               )}>
                  {selectedSession.isConnected ? "Online" : "Offline"}
               </Badge>
            )}
         </div>
         <Button id="new-session-btn" size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-full h-9">
            <Plus className="h-4 w-4 mr-2" /> New Session
         </Button>
      </div>

      {/* Grid 12 cols Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 space-y-8">
            {isAdmin && (
                <Card className="border-none shadow-none bg-muted/10">
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" /> Performance Plateforme
                                </CardTitle>
                                <CardDescription className="text-[10px]">Volume de messages et activité IA des 7 derniers jours.</CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-[9px] font-bold bg-background">7 JOURS</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="h-[200px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData}>
                                    <defs>
                                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#25D366" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" strokeOpacity={0.1} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fontSize: 9, fill: '#888888'}}
                                        dy={10}
                                        tickFormatter={(str) => {
                                            const date = new Date(str);
                                    if (isNaN(date.getTime())) return '-';
                                            return date.toLocaleDateString('fr-FR', { weekday: 'short' });
                                        }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#888888'}} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                    />
                                    <Area type="monotone" dataKey="messages" name="Messages" stroke="#25D366" strokeWidth={2} fillOpacity={1} fill="url(#colorMessages)" />
                                    <Area type="monotone" dataKey="credits" name="Crédits" stroke="#f59e0b" strokeWidth={2} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card id="active-session-card" className="border-none shadow-none bg-muted/10">
               <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selectedSessionId || "Aucune session"}</p>
                          <p className="text-xs text-muted-foreground">WhatsApp Session</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/ai/config?sessionId=${selectedSessionId}`)}>
                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                     </Button>
                  </div>
                  <SessionCard session={selectedSession} onRefresh={fetchSessions} onCreate={() => setIsCreateOpen(true)} />
               </CardContent>
            </Card>

            <Tabs defaultValue="history" className="space-y-4">
               <TabsList className="bg-muted/50 p-1 rounded-lg h-9 gap-1 w-full sm:w-auto">
                  <TabsTrigger value="history" className="text-[11px] font-semibold px-6">History</TabsTrigger>
                  {isAdmin && <TabsTrigger value="logs" className="text-[11px] font-semibold px-6">System Logs</TabsTrigger>}
               </TabsList>

               <TabsContent value="history" className="space-y-4">
                  <Card>
                     <Table>
                        <TableHeader>
                           <TableRow className="hover:bg-transparent border-muted/30">
                              <TableHead className="text-[10px] font-semibold text-muted-foreground">Destination</TableHead>
                              <TableHead className="text-[10px] font-semibold text-muted-foreground">Status</TableHead>
                              <TableHead className="text-[10px] font-semibold text-muted-foreground text-right">Time</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {recentActivities.filter(a => a.action === 'MESSAGE_SEND' || a.action === 'send_message').map((msg, i) => (
                              <TableRow key={i} className="hover:bg-muted/50">
                                 <TableCell className="text-sm truncate max-w-[150px]">{msg.resource_id}</TableCell>
                                 <TableCell>
                                    <Badge className={cn(
                                       "border-none text-[9px] font-semibold",
                                       (msg.success === 1 || msg.success === true)
                                         ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                         : "bg-red-500/10 text-red-700 dark:text-red-400"
                                    )}>
                                       {(msg.success === 1 || msg.success === true) ? 'Sent' : 'Failed'}
                                    </Badge>
                                 </TableCell>
                                 <TableCell className="text-right text-[10px] text-muted-foreground">
                                    {(() => {
                                       const d = new Date(msg.created_at || msg.timestamp);
                                       return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString();
                                    })()}
                                 </TableCell>
                              </TableRow>
                           ))}
                           {recentActivities.filter(a => a.action === 'MESSAGE_SEND' || a.action === 'send_message').length === 0 && (
                              <TableRow><TableCell colSpan={3} className="text-center py-10 text-xs text-muted-foreground italic">Aucun message récent</TableCell></TableRow>
                           )}
                        </TableBody>
                     </Table>
                  </Card>
               </TabsContent>

               {isAdmin && (
                  <TabsContent value="logs" className="space-y-4">
                     <Card className="bg-zinc-950 text-zinc-400 font-mono text-[10px] p-4 overflow-x-auto min-h-[200px] border-none shadow-inner">
                        <div className="space-y-1">
                           {recentActivities.map((log, i) => (
                              <div key={i} className="flex gap-4">
                                 <span className="text-zinc-600">
                                    [{(() => {
                                       const d = new Date(log.timestamp || log.created_at);
                                       return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString();
                                    })()}]
                                 </span>
                                 <span className={cn(log.status === 'success' ? "text-green-500" : "text-red-500")}>{(log.action || "ACTION").toUpperCase()}</span>
                                 <span className="truncate max-w-[400px]">
                                    {typeof log.details === 'string' ? log.details : (log.details ? JSON.stringify(log.details) : '-')}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </Card>
                  </TabsContent>
               )}
            </Tabs>
         </div>

         <div className="lg:col-span-4 space-y-8">
            {isAdmin && (
               <Card className="border-none bg-muted/10 shadow-none">
                  <CardHeader className="p-4 pb-0">
                     <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                        <Activity className="h-3 w-3" /> System Activities
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                     {recentActivities.slice(0, 4).map((activity, i) => (
                        <div key={i} className="flex items-start gap-3 border-b border-border/40 last:border-0 pb-3 last:pb-0">
                           <div className="h-6 w-6 rounded bg-background border flex items-center justify-center shrink-0">
                              <Zap className="h-3 w-3 text-muted-foreground" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{activity.action || "Action"}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                 {typeof activity.details === 'string' ? activity.details : (activity.details ? JSON.stringify(activity.details) : '-')}
                              </p>
                           </div>
                        </div>
                     ))}
                     <Button variant="link" size="sm" className="p-0 h-auto text-[10px] font-semibold" asChild>
                        <Link href="/dashboard/activities">View All Activities →</Link>
                     </Button>
                  </CardContent>
               </Card>
            )}

            <CreditCardUI credits={credits} userRole={isAdmin ? 'admin' : 'user'} />
         </div>
      </div>

      {/* New Session Sheet */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="sm:max-w-[400px]">
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
                <SheetTitle>New WhatsApp Session</SheetTitle>
                <SheetDescription className="text-xs">Initialisez un nouveau compte pour l&apos;automatisation.</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-4">
                <FormField control={form.control} name="sessionId" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold text-muted-foreground">Session Name</FormLabel>
                      <FormControl><Input placeholder="ex: support-client" {...field} className="h-9 text-sm" /></FormControl>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {['support', 'ventes', 'marketing', 'bot'].map(tag => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] cursor-pointer hover:bg-primary/10"
                              onClick={() => form.setValue('sessionId', tag)}
                            >
                              {tag}
                            </Badge>
                        ))}
                      </div>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-semibold text-muted-foreground">Phone Number (Optional)</FormLabel>
                      <FormControl><Input placeholder="ex: 2376..." {...field} className="h-9 text-sm" /></FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
              <SheetFooter><Button type="submit" className="w-full">Create Session</Button></SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext: string }) {
  return (
    <Card className="border border-border bg-card rounded-lg shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  )
}
