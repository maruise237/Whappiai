"use client"

import * as React from "react"
import Link from "next/link"
import { SessionCard } from "@/components/dashboard/session-card"
import { MessagingTabs } from "@/components/dashboard/messaging-tabs"
import { LogViewer } from "@/components/dashboard/log-viewer"
import { ApiUsageCard } from "@/components/dashboard/api-usage-card"
import { DashboardSkeleton, TableSkeleton, StatsSkeleton, ActivitySkeleton } from "@/components/dashboard/dashboard-skeleton"
import { CreditCardUI } from "@/components/dashboard/credit-card-ui"
import { api } from "@/lib/api"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Plus, History, ArrowRight, Activity, Terminal, Code2, Layers, ChevronDown, Coins, LogOut, Smartphone, Scan, Zap } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
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
import { cn, getFriendlyErrorMessage } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

export default function DashboardPage() {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newSessionId, setNewSessionId] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
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
  const [credits, setCredits] = React.useState<{
    balance: number,
    used: number,
    plan: string,
    history: any[]
  } | null>(null)

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
        const sessionsMap = new Map(prev.map(s => [s.sessionId, s]));
        let changed = false;

        updates.forEach((update: any) => {
          const existing = sessionsMap.get(update.sessionId);
          if (existing) {
            const oldStatus = existing.isConnected;
            const newStatus = update.isConnected;
            const statusDetail = update.detail || "";

            if (!oldStatus && newStatus) {
              toast.success(`Session ${update.sessionId} connected successfully!`);
              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#34d399', '#6ee7b7', '#ffffff']
              });
            } else if (oldStatus && !newStatus && statusDetail.toLowerCase().includes("disconnect")) {
              toast.error(`Session ${update.sessionId} disconnected`, {
                description: statusDetail
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

  const fetchCredits = async () => {
    try {
      const token = await getToken()
      const response = await api.credits.get(token || undefined)
      if (response && response.data) {
        setCredits(response.data)
      }
    } catch (error) {
      console.error("Failed to fetch credits:", error)
    }
  }

  const handleClaimWelcomeCredits = async () => {
    const toastId = toast.loading("Réclamation des crédits...")
    try {
      const token = await getToken()
      const response = await fetch('/api/v1/credits/claim-welcome', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.status === 'success') {
        toast.success(data.message, { id: toastId })
        fetchCredits()
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF4500']
        })
      } else {
        toast.error(data.message || "Erreur lors de la réclamation", { id: toastId })
      }
    } catch (error) {
      toast.error("Erreur réseau", { id: toastId })
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
      await api.sessions.create(newSessionId, phoneNumber || undefined, token || undefined)
      toast.success("Session créée !", { id: toastId })
      setNewSessionId("")
      setPhoneNumber("")
      setIsCreateOpen(false)
      const data = await fetchSessions()
      fetchRecentActivities(data)
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (error: any) {
      toast.error("Creation failed", {
        id: toastId,
        description: getFriendlyErrorMessage(error)
      })
    } finally {
      setCreating(false)
    }
  }

  React.useEffect(() => {
    const init = async () => {
      const data = await fetchSessions()
      fetchRecentActivities(data)
      fetchCredits()
    }

    init()

    // Polling for updates every 30 seconds
    const interval = setInterval(async () => {
      console.log("[Dashboard] Polling for updates...")
      const data = await fetchSessions()
      fetchRecentActivities(data)
      fetchCredits()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  // Current selected session
  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId)

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-10 pt-6">
      <DashboardTour enabled={guideEnabled} onExit={handleGuideExit} />

      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">Manage your sessions and monitor API activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {sessions.length} Sessions Total
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className={cn(
        "grid gap-4 sm:gap-6 grid-cols-2",
        userRole === 'admin' ? "lg:grid-cols-4" : "lg:grid-cols-3"
      )}>
        <div className="flex flex-col p-4 rounded-md border border-border bg-card shadow-sm">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">Total Sessions</span>
          <span className="text-xl font-bold tracking-tight">{sessions.length}</span>
        </div>
        <div className="flex flex-col p-4 rounded-md border border-border bg-card shadow-sm">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">Success Rate</span>
          <span className="text-xl font-bold tracking-tight text-emerald-600">{summary.successRate}%</span>
        </div>
        <div className="flex flex-col p-4 rounded-md border border-border bg-card shadow-sm">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">Messages Sent</span>
          <span className="text-xl font-bold tracking-tight">{summary.messagesSent}</span>
        </div>
        {userRole === 'admin' && (
          <div className="flex flex-col p-4 rounded-md border border-border bg-card shadow-sm">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-1">System Activities</span>
            <span className="text-xl font-bold tracking-tight">{summary.totalActivities}</span>
          </div>
        )}
      </div>

      {/* Welcome Credits Claim (Conditional) */}
      {credits && credits.balance < 100 && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-primary">Réclamez vos 60 crédits de bienvenue !</h4>
              <p className="text-[10px] font-bold uppercase tracking-tight opacity-60">Il semble que vous n'ayez pas encore reçu vos crédits gratuits pour démarrer.</p>
            </div>
          </div>
          <Button 
            onClick={handleClaimWelcomeCredits}
            className="w-full sm:w-auto px-8 h-12 rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
          >
            Réclamer 60 crédits 🎁
          </Button>
        </div>
      )}

      {/* Session Selection & Status Bar */}
      <div className="flex items-center justify-between p-4 rounded-md border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <SessionSelect
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={setSelectedSessionId}
          />
          {selectedSession && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-500/20">
              <span className={cn("h-1 w-1 rounded-full", selectedSession.isConnected ? "bg-emerald-500" : "bg-muted-foreground/30")} />
              {selectedSession.isConnected ? "OPERATIONAL" : "DISCONNECTED"}
            </div>
          )}
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="h-9 px-4 rounded-md font-medium text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Session</span>
        </Button>
      </div>

      {/* Main Content Sections - Mobile-First Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Section - Operations (8/12) */}
        <div className="lg:col-span-8 space-y-10">
          <section id="connection" className="scroll-mt-24 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session & Connection</h3>
            <SessionCard
              session={selectedSession}
              onRefresh={fetchSessions}
              onCreate={() => setIsCreateOpen(true)}
            />
          </section>

          <section id="messaging" className="scroll-mt-24 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Messaging</h3>
            <MessagingTabs
              session={selectedSession}
              sessions={sessions}
              onSessionChange={setSelectedSessionId}
            />
          </section>

          {userRole === 'admin' && (
            <section id="logs" className="scroll-mt-24 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Logs</h3>
              <LogViewer />
            </section>
          )}
        </div>

        {/* Right Section - Sidebar Context (4/12) */}
        <div className="lg:col-span-4 space-y-10">
          {userRole === 'admin' && (
            <section id="activities" className="scroll-mt-24 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
              <ActivityCard
                loading={activitiesLoading}
                activities={recentActivities}
              />
            </section>
          )}

          <section id="usage" className="scroll-mt-24 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan & Crédits</h3>
            {!credits ? <StatsSkeleton /> : (
              <CreditCardUI credits={credits} userRole={userRole} />
            )}
          </section>
        </div>
      </div>

      {/* Create Session Sheet */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[450px] border-l border-border bg-card p-0 flex flex-col">
          <SheetHeader className="p-8 pb-4 space-y-2">
            <SheetTitle className="text-2xl font-black tracking-tight uppercase">New WhatsApp Session</SheetTitle>
            <SheetDescription className="text-xs font-bold uppercase tracking-widest opacity-40">
              Create a new instance to start sending messages.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-auto px-8 py-4 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Session ID</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Unique name for your instance. Use alphanumeric characters and hyphens only.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                placeholder="e.g. marketing-dept"
                value={newSessionId}
                onChange={(e) => setNewSessionId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                className="h-12 text-sm font-medium border-border shadow-none focus-visible:ring-1"
              />
              {!newSessionId && (
                <div className="flex flex-wrap gap-2">
                  {['marketing', 'support', 'alerts'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setNewSessionId(`${suggestion}-${Math.floor(Math.random() * 900) + 100}`)}
                      className="text-[9px] px-3 py-1 rounded-full bg-secondary/50 text-secondary-foreground hover:bg-primary/20 transition-colors font-bold uppercase tracking-widest border border-border/50"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Phone Number (Optional)</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Number to pre-fill for pairing. Include country code (e.g. 237...).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                placeholder="237..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-12 text-sm font-medium border-border shadow-none focus-visible:ring-1"
              />
            </div>

            <div className="p-6 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Pro Tip</span>
              </div>
              <p className="text-[10px] leading-relaxed font-bold uppercase tracking-tight opacity-60">
                Identifiers are permanent. Choose a clear name like <span className="text-primary italic">"support-camera"</span> if you plan to use multiple devices.
              </p>
            </div>
          </div>
          <SheetFooter className="p-8 border-t border-border bg-muted/20">
            <Button variant="ghost" onClick={() => {
              setIsCreateOpen(false);
              setNewSessionId("");
              setPhoneNumber("");
            }} className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest">Cancel</Button>
            <Button onClick={handleCreateSession} disabled={creating || !newSessionId} className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
              {creating ? "Creating..." : "Create Session"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// --- Helper Components ---

function SessionSelect({ sessions, selectedId, onSelect }: {
  sessions: any[],
  selectedId: string | null,
  onSelect: (id: string) => void
}) {
  return (
    <Select value={selectedId || ""} onValueChange={onSelect}>
      <SelectTrigger className="w-[180px] h-9 text-xs font-medium border-border">
        <SelectValue placeholder="Select Session" />
      </SelectTrigger>
      <SelectContent>
        {sessions.map((s) => (
          <SelectItem key={s.sessionId} value={s.sessionId} className="text-xs">
            <div className="flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", s.isConnected ? "bg-emerald-500" : "bg-slate-300")} />
              {s.sessionId}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActivityCard({ activities, loading }: { activities: any[], loading: boolean }) {
  if (loading) return <ActivitySkeleton count={3} />;

  if (!activities || activities.length === 0) return (
    <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/50">
      <div className="flex flex-col items-center gap-2">
        <Activity className="w-6 h-6 text-muted-foreground/20" />
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">No recent activity</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
      <div className="divide-y divide-border">
        {activities.slice(0, 5).map((activity, i) => (
          <div key={i} className="p-3 flex items-start gap-4 hover:bg-muted/30 transition-all duration-200 border-l-2 border-transparent hover:border-primary">
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-sm",
              activity.success ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
            )}>
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-tight truncate group-hover:text-primary transition-colors">{activity.action.replace(/_/g, ' ')}</span>
                <span className="text-[9px] text-muted-foreground/60 font-medium">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/40 truncate font-bold uppercase tracking-widest">{activity.sessionId || activity.resourceId || 'System'}</p>
            </div>
          </div>
        ))}
      </div>
      <Link href="/dashboard/activities">
        <Button variant="ghost" className="w-full rounded-none border-t border-border h-9 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
          View Full History
        </Button>
      </Link>
    </div>
  );
}
