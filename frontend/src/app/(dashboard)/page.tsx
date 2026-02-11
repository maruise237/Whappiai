"use client"

import * as React from "react"
import Link from "next/link"
import { SessionCard } from "@/components/dashboard/session-card"
import { MessagingTabs } from "@/components/dashboard/messaging-tabs"
import { LogViewer } from "@/components/dashboard/log-viewer"
import { ApiUsageCard } from "@/components/dashboard/api-usage-card"
import { DashboardSkeleton, TableSkeleton, StatsSkeleton, ActivitySkeleton } from "@/components/dashboard/dashboard-skeleton"
import { api } from "@/lib/api"
import { Plus, History, ArrowRight, Activity, Terminal, Code2, Layers } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useWebSocket } from "@/providers/websocket-provider"
import { useUser, useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import { DashboardTour } from "@/components/dashboard/dashboard-tour"
import { usePristine } from "@/hooks/use-pristine"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newSessionId, setNewSessionId] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [activeMessagingTab, setActiveMessagingTab] = React.useState("text")
  const [guideEnabled, setGuideEnabled] = React.useState(false)
  const [recentActivities, setRecentActivities] = React.useState<any[]>([])
  const [activitiesLoading, setActivitiesLoading] = React.useState(true)
  const [summary, setSummary] = React.useState({
    totalActivities: 0,
    successRate: 0,
    activeSessions: 0,
    messagesSent: 0
  })

  const [mounted, setMounted] = React.useState(false)
  const [userRole, setUserRole] = React.useState<string | null>(null)

  const { formRef, validate } = usePristine()

  const { lastMessage } = useWebSocket()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  React.useEffect(() => {
    setMounted(true)
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress
      let role = (user.publicMetadata?.role as string) || "user"
      
      // Auto-promote maruise237@gmail.com to admin
      if (email && email.toLowerCase() === 'maruise237@gmail.com') {
        role = 'admin'
      }
      
      setUserRole(role)
      // Also store in sessionStorage for any legacy components that still use it
      sessionStorage.setItem("userRole", role)
      sessionStorage.setItem("userEmail", email || "")
    }
  }, [isLoaded, user])

  // Auto-start guide if first time
  React.useEffect(() => {
    const hasSeenGuide = localStorage.getItem("hasSeenGuide")
    if (!hasSeenGuide) {
      setGuideEnabled(true)
    }
  }, [])

  const handleGuideExit = () => {
    setGuideEnabled(false)
    localStorage.setItem("hasSeenGuide", "true")
  }

  // Handle real-time updates
  React.useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'session-update') {
      const updates = lastMessage.data
      setSessions(prev => {
        const newSessions = [...prev]
        updates.forEach((update: any) => {
          const index = newSessions.findIndex(s => s.sessionId === update.sessionId)
          if (index !== -1) {
            // Check if status changed to connected
            const oldStatus = newSessions[index].isConnected
            const newStatus = update.isConnected
            
            if (!oldStatus && newStatus) {
              toast.success(`Session ${update.sessionId} connectée avec succès !`)
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#34d399', '#6ee7b7', '#ffffff']
              })
            }
            
            newSessions[index] = { ...newSessions[index], ...update }
          } else {
            newSessions.push(update)
          }
        })
        return newSessions
      })
    } else if (lastMessage.type === 'session-deleted') {
      const { sessionId } = lastMessage.data
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId))
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null)
      }
    }
  }, [lastMessage, selectedSessionId])

  // Update active sessions count when sessions list changes
  React.useEffect(() => {
    const activeCount = sessions.filter(s => s.isConnected).length
    setSummary(prev => ({
      ...prev,
      activeSessions: activeCount
    }))
  }, [sessions])

  const fetchSessions = async () => {
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      const sessionsData = data || []
      setSessions(sessionsData)
      if (sessionsData.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessionsData[0].sessionId)
      }
      return sessionsData
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivities = async (currentSessions?: any[]) => {
    setActivitiesLoading(true)
    try {
      console.log("[Dashboard] Fetching recent activities and summary...")
      const token = await getToken()
      // Fetch both activities list and summary for more accurate stats
      const [listData, summaryData] = await Promise.all([
        api.activities.list(token || undefined),
        api.activities.summary(7, token || undefined)
      ])
      
      const list = listData || []
      const backendSummary = summaryData || {}
      
      console.log(`[Dashboard] Received ${list.length} activities and backend summary`)
      setRecentActivities(list.slice(0, 5))
      
      // Use provided sessions or state sessions
      const sessionsToUse = currentSessions || sessions
      
      // Calculate real-time session count
      const activeCount = sessionsToUse.filter(s => s.isConnected).length
      
      // Use backend summary for totals (more accurate than last 100 logs)
      // Fallback to manual calculation if summary is empty
      const totalActivities = backendSummary.totalActivities || list.length
      
      // Messages sent normalization (from backend or manual)
      const sentCount = backendSummary.byAction?.send_message || list.filter((a: any) => {
        const action = (a.action || "").toLowerCase();
        return action === 'send_message' || action === 'message_send' || action === 'campaign_message';
      }).length

      // Success rate (from backend or manual)
      let rate = 0
      if (backendSummary.successRate !== undefined) {
        rate = backendSummary.successRate
      } else if (list.length > 0) {
        const success = list.filter((a: any) => a.success).length
        rate = Math.round((success / list.length) * 100)
      }

      console.log(`[Dashboard] Summary finalized: total=${totalActivities}, active=${activeCount}, sent=${sentCount}`)

      setSummary({
        totalActivities,
        successRate: rate,
        activeSessions: activeCount,
        messagesSent: sentCount
      })
    } catch (error) {
      console.error("[Dashboard] Failed to fetch activities:", error)
    } finally {
      setActivitiesLoading(false)
    }
  }

  const handleCreateSession = async () => {
    if (!newSessionId) return
    
    // Validate form before proceeding
    const valid = validate();
    if (!valid) return;

    setCreating(true)
    const toastId = toast.loading("Création de la session...")
    try {
      const token = await getToken()
      await api.sessions.create(newSessionId, undefined, token || undefined)
      toast.success("Session créée !", { id: toastId })
      setNewSessionId("")
      setIsCreateOpen(false)
      const data = await fetchSessions()
      fetchRecentActivities(data)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (error: any) {
      toast.error("Échec de la création", {
        id: toastId,
        description: error.message || "Impossible de créer la session"
      })
    } finally {
      setCreating(false)
    }
  }

  React.useEffect(() => {
    const init = async () => {
      const data = await fetchSessions()
      fetchRecentActivities(data)
    }
    
    init()

    // Polling for updates every 30 seconds
    const interval = setInterval(async () => {
      console.log("[Dashboard] Polling for updates...")
      const data = await fetchSessions()
      fetchRecentActivities(data)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId)

  return (
    <div className="space-y-10 pb-10" suppressHydrationWarning>
      <DashboardTour enabled={guideEnabled} onExit={handleGuideExit} />

      <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
        <div className={cn(
          "grid gap-4 sm:gap-8 grid-cols-1 sm:grid-cols-2",
          userRole === 'admin' ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}>
          {userRole === 'admin' && (
            <Card className="rounded-xl border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative hover:-translate-y-1 min-h-[130px] sm:min-h-[160px] flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors duration-300" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-4 relative z-10 p-4 sm:p-6">
                <CardTitle className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Total Activités</CardTitle>
                <div className="p-2 sm:p-3 bg-primary/10 rounded-xl border border-primary/20 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pb-4 sm:pb-6 px-4 sm:px-6">
                <div className="text-3xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-0.5 sm:mb-1 leading-none">{summary.totalActivities}</div>
                <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">7 derniers jours</p>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative hover:-translate-y-1 min-h-[130px] sm:min-h-[160px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-4 relative z-10 p-4 sm:p-6">
              <CardTitle className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Taux de Succès</CardTitle>
              <div className="p-2 sm:p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin-slow" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pb-4 sm:pb-6 px-4 sm:px-6">
              <div className="text-3xl sm:text-5xl font-black tracking-tighter text-emerald-500 mb-0.5 sm:mb-1 leading-none">{summary.successRate}%</div>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Optimisation IA active</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative hover:-translate-y-1 min-h-[130px] sm:min-h-[160px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-4 relative z-10 p-4 sm:p-6">
              <CardTitle className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Sessions Actives</CardTitle>
              <div className="p-2 sm:p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pb-4 sm:pb-6 px-4 sm:px-6">
              <div className="text-3xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-0.5 sm:mb-1 leading-none">{summary.activeSessions}</div>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Tunnels sécurisés</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative hover:-translate-y-1 min-h-[130px] sm:min-h-[160px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-colors duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-4 relative z-10 p-4 sm:p-6">
              <CardTitle className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Messages Envoyés</CardTitle>
              <div className="p-2 sm:p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pb-4 sm:pb-6 px-4 sm:px-6">
              <div className="text-3xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-0.5 sm:mb-1 leading-none">{summary.messagesSent}</div>
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Volume total</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Header Section - Modern SaaS Style */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 bg-white dark:bg-card backdrop-blur-xl p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-primary/10 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-300" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -ml-32 -mb-32 group-hover:bg-primary/10 transition-colors duration-300" />
        
        <div className="space-y-2 sm:space-y-3 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="space-y-1 sm:space-y-1.5">
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-none drop-shadow-sm">
                SESSIONS WHATSAPP
              </h1>
              <div className="flex items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border bg-background/50 border-primary/10 text-primary shadow-sm">
                  v3.2.0
                </Badge>
                <div className="h-1 w-1 rounded-full bg-primary/30" />
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Enterprise Edition</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-[10px] sm:text-xs font-medium leading-relaxed max-w-lg opacity-80">
            Pilotez l'ensemble de vos instances WhatsApp, gérez les connexions et automatisez vos flux de communication.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 relative z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setGuideEnabled(true)} 
            className="help-button h-9 sm:h-10 px-3 sm:px-5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-primary/10 transition-all duration-200 rounded-lg border border-slate-200/50 dark:border-primary/5"
          >
            Aide
          </Button>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-primary/10 hidden lg:block" />

          {sessions.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-background/40 p-1 rounded-lg border border-slate-200 dark:border-primary/5 shadow-inner backdrop-blur-sm w-full sm:w-auto">
              <Select 
                value={selectedSessionId || ""} 
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger className="w-full sm:w-[180px] lg:w-[200px] border-none shadow-none h-9 bg-transparent hover:bg-white dark:hover:bg-primary/5 transition-all duration-200 rounded-lg font-bold text-[9px] uppercase tracking-widest px-3">
                  <SelectValue placeholder="Session active" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-background/95 p-1">
                  {sessions.map((session) => (
                    <SelectItem 
                      key={session.sessionId} 
                      value={session.sessionId}
                      className="rounded-md focus:bg-primary/5 focus:text-primary transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 py-1">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          session.isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                        )} />
                        <span className="font-bold">{session.sessionId}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="h-10 sm:h-12 px-5 sm:px-7 font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20 rounded-lg text-[9px] sm:text-[10px] gap-2 sm:gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90 border border-white/10 w-full sm:w-auto text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Session</span>
          </Button>
        </div>
      </div>

      {/* Grid Layout - 3/4 PC, 1 Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 units on LG+) - Main Operations */}
        <div className="lg:col-span-8 space-y-12">
          {/* Section 1: Session & Connection */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">1. Connexion & Session</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Initialisez votre tunnel WhatsApp</p>
              </div>
            </div>
            <div className="transition-all duration-200 hover:translate-y-[-4px]">
              <SessionCard 
                session={selectedSession} 
                onRefresh={fetchSessions} 
                onCreate={() => setIsCreateOpen(true)} 
              />
            </div>
          </section>

          {/* Section 2: Messaging */}
          <section className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">2. Envoi de Messages</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Testez vos automatisations manuellement</p>
              </div>
            </div>
            <div className="transition-all duration-200 hover:translate-y-[-4px]">
              <MessagingTabs 
                session={selectedSession} 
                sessions={sessions}
                onSessionChange={setSelectedSessionId}
                onTabChange={setActiveMessagingTab} 
              />
            </div>
          </section>

          {/* Section 3: Live Logs (Wide) - Admin only */}
          {userRole === 'admin' && (
            <section className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                  <Terminal className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">3. Flux en Temps Réel</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Monitorage en direct des événements</p>
                </div>
              </div>
              <div className="transition-all duration-200 hover:translate-y-[-4px]">
                <LogViewer />
              </div>
            </section>
          )}
        </div>

        {/* Right Column (4 units on LG+) - Activities & API */}
        <div className="lg:col-span-4 space-y-12">
          {/* Section 4: Activities - Admin only */}
          {userRole === 'admin' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <History className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xl font-black uppercase tracking-widest text-amber-500">Activités</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Historique</p>
                  </div>
                </div>
                <Link href="/activities" prefetch={false}>
                  <Button variant="ghost" size="sm" className="h-10 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500/10 hover:text-amber-500 transition-all border border-transparent hover:border-amber-500/20">
                    Tout voir <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-lg border border-slate-200 dark:border-primary/10 overflow-hidden transition-all duration-200 hover:border-amber-500/20 group shadow-xl">
                {activitiesLoading ? (
                  <ActivitySkeleton count={5} />
                ) : recentActivities.length === 0 ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-muted/30 rounded-lg flex items-center justify-center mx-auto mb-2 border border-slate-100 dark:border-primary/5">
                      <History className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Aucune activité</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-primary/5">
                    {recentActivities.map((activity, i) => (
                      <div key={i} className="p-5 flex items-start gap-4 hover:bg-amber-500/[0.02] transition-all duration-200 group/item">
                        <div className={cn(
                          "p-3 rounded-lg shrink-0 transition-all duration-200 group-hover/item:scale-110 shadow-sm border",
                          activity.success 
                            ? "bg-primary/10 text-primary border-primary/10" 
                            : "bg-destructive/10 text-destructive border-destructive/10"
                        )}>
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 py-0.5">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <p className="text-xs font-black uppercase tracking-widest truncate text-slate-900 dark:text-slate-100">
                              {activity.action.replace(/_/g, ' ')}
                            </p>
                            <span className="text-[9px] font-bold text-muted-foreground/40 whitespace-nowrap bg-slate-100 dark:bg-muted/30 px-2 py-0.5 rounded-lg transition-all duration-200">
                              {mounted ? new Date(activity.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[8px] font-bold uppercase tracking-tighter px-2 py-0 rounded-lg transition-all duration-200",
                                activity.success 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                  : "bg-red-500/10 text-red-600 dark:text-red-400"
                              )}
                            >
                              {activity.success ? 'Succès' : 'Erreur'}
                            </Badge>
                            <p className="text-[9px] text-muted-foreground/50 line-clamp-1 uppercase tracking-widest font-bold">
                              {activity.resource}: <span className="text-primary/80">{activity.resourceId || activity.userEmail}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* Section 5: API Documentation - Admin only */}
          {userRole === 'admin' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                    <Code2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Documentation</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Intégration API</p>
                  </div>
                </div>
                <Link href="/docs" prefetch={false}>
                  <Button variant="ghost" size="sm" className="h-10 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20">
                    Explorer <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              <Card className="bg-primary/5 dark:bg-primary/5 backdrop-blur-xl rounded-lg border-2 border-dashed border-primary/20 p-8 text-center group hover:bg-primary/10 transition-all duration-300">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Code2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest mb-2">Prêt pour l'intégration ?</h3>
                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest leading-relaxed mb-6">
                  Consultez notre documentation complète pour intégrer Whappi à vos propres applications.
                </p>
                <Link href="/docs" prefetch={false}>
                  <Button className="h-10 px-6 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white">
                    Voir la Documentation
                  </Button>
                </Link>
              </Card>
            </section>
          )}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg border border-primary/10 shadow-2xl backdrop-blur-sm bg-background/95">
          <DialogHeader className="space-y-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner border border-primary/20">
              <Plus className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold tracking-tight text-primary">
                Nouvelle Session
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs font-medium">
                Entrez un identifiant unique pour votre nouvelle session WhatsApp.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form ref={formRef} className="py-6 space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateSession(); }}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 ml-1">
                ID de la Session
              </label>
              <Input 
                name="sessionId"
                placeholder="ex: ma-session-business" 
                value={newSessionId}
                onChange={(e) => setNewSessionId(e.target.value)}
                disabled={creating}
                required
                data-pristine-required-message="L'identifiant est requis"
                data-pristine-pattern="/^[a-zA-Z0-9-]+$/"
                data-pristine-pattern-message="Lettres, chiffres et traits d'union uniquement"
                className="h-14 rounded-lg border border-primary/10 bg-background/50 focus:bg-background focus:border-primary/30 focus:ring-primary/20 transition-all duration-200 font-mono text-sm"
              />
            </div>
          </form>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setIsCreateOpen(false)} 
              disabled={creating}
              className="h-14 flex-1 rounded-lg font-semibold uppercase tracking-wider text-xs hover:bg-primary/5 transition-all duration-200"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateSession} 
              disabled={creating || !newSessionId}
              className="h-14 flex-[1.5] rounded-lg font-semibold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all duration-200 border border-primary/20"
            >
              {creating ? (
                <div className="w-5 h-5 mr-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="w-5 h-5 mr-3" />
              )}
              {creating ? "Création..." : "Créer la Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button (FAB) for Mobile */}
      <div className="md:hidden fixed bottom-28 right-6 z-50">
        <Button
          onClick={() => setIsCreateOpen(true)}
          size="icon"
          className="h-16 w-16 rounded-lg shadow-2xl shadow-primary/40 bg-primary hover:bg-primary/90 text-white border-4 border-white dark:border-slate-900 transition-all duration-200 active:scale-90"
        >
          <Plus className="w-8 h-8" />
        </Button>
      </div>
    </div>
  )
}
