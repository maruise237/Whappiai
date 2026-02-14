"use client"

import * as React from "react"
import {
  Activity,
  History,
  RefreshCcw,
  LogIn,
  MessageSquare,
  CheckCircle,
  Circle,
  Folder,
  Megaphone,
  PauseCircle,
  Pencil,
  User,
  Settings,
  UserPlus,
  UserMinus,
  Phone,
  PlayCircle,
  PlusCircle,
  Send,
  Shield,
  Trash,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { api } from "@/lib/api"
import { toast } from "sonner"
import { StatsSkeleton, TableSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { cn } from "@/lib/utils"

import { useRouter } from "next/navigation"
import { useUser, useAuth } from "@clerk/nextjs"

interface ActivityItem {
  timestamp: string
  userEmail: string
  action: string
  resource: string
  resourceId?: string
  details: any
  ip?: string
  success: boolean
}

interface ActivitySummary {
  totalActivities: number
  activeUsers: number
  sessionsCreated: number
  messagesSent: number
}

const getActionIcon = (action: string) => {
  const key = action.toLowerCase()
  switch (key) {
    case "login":
      return <LogIn className="h-4 w-4 text-primary" />
    case "session_create":
    case "create":
      return <PlusCircle className="h-4 w-4 text-green-600" />
    case "session_delete":
    case "delete":
      return <Trash className="h-4 w-4 text-destructive" />
    case "update":
      return <Pencil className="h-4 w-4 text-yellow-600" />
    case "message_send":
    case "send_message":
      return <Send className="h-4 w-4 text-blue-500" />
    case "create_user":
      return <UserPlus className="h-4 w-4 text-green-600" />
    case "update_user":
      return <Settings className="h-4 w-4 text-yellow-600" />
    case "delete_user":
      return <UserMinus className="h-4 w-4 text-destructive" />
    case "campaign_create":
      return <PlusCircle className="h-4 w-4 text-green-600" />
    case "campaign_update":
      return <Pencil className="h-4 w-4 text-yellow-600" />
    case "campaign_delete":
      return <Trash className="h-4 w-4 text-destructive" />
    case "campaign_start":
    case "campaign_resume":
      return <PlayCircle className="h-4 w-4 text-primary" />
    case "campaign_pause":
      return <PauseCircle className="h-4 w-4 text-yellow-600" />
    case "campaign_complete":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "campaign_retry":
      return <RefreshCcw className="h-4 w-4 text-yellow-600" />
    case "campaign_message":
      return <MessageSquare className="h-4 w-4 text-blue-500" />
    default:
      return <Circle className="h-4 w-4" />
  }
}

const getResourceIcon = (resource: string) => {
  const key = resource.toLowerCase()
  switch (key) {
    case "auth":
      return <Shield className="h-4 w-4" />
    case "session":
      return <Phone className="h-4 w-4" />
    case "message":
      return <MessageSquare className="h-4 w-4" />
    case "user":
      return <User className="h-4 w-4" />
    case "campaign":
      return <Megaphone className="h-4 w-4" />
    case "list":
      return <Users className="h-4 w-4" />
    default:
      return <Folder className="h-4 w-4" />
  }
}

const formatAction = (action: string) => {
  let display = action.replace(/_/g, " ")
  if (display.toUpperCase().startsWith("CAMPAIGN ")) display = display.substring(9)
  if (display.toUpperCase().startsWith("SESSION ")) display = display.substring(8)
  return display.replace(/\b\w/g, (l) => l.toUpperCase())
}

const formatDetails = (activity: ActivityItem) => {
  if (!activity.details) return "-"

  const details: string[] = []
  const action = activity.action.toUpperCase()

  if (action === "MESSAGE_SEND" || action === "SEND_MESSAGE") {
    if (activity.details.recipient) details.push(`To: ${activity.details.recipient}`)
    if (activity.details.messageType) details.push(`Type: ${activity.details.messageType}`)
  } else if (action === "CREATE_USER" || action === "UPDATE_USER") {
    if (activity.details.newUserEmail) details.push(`Email: ${activity.details.newUserEmail}`)
    if (activity.details.role) details.push(`Role: ${activity.details.role}`)
    if (activity.details.changes) {
      const changes = Object.entries(activity.details.changes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      details.push(`Changes: ${changes}`)
    }
  } else if (action === "CAMPAIGN_CREATE" || action === "CAMPAIGN_START") {
    if (activity.details.name) details.push(`Name: ${activity.details.name}`)
    if (activity.details.recipientCount) details.push(`Recipients: ${activity.details.recipientCount}`)
  } else if (action === "CAMPAIGN_MESSAGE") {
    if (activity.details.recipient) details.push(`To: ${activity.details.recipient}`)
    if (activity.details.status) details.push(`Status: ${activity.details.status}`)
    if (activity.details.error) details.push(`Error: ${activity.details.error}`)
  } else if (activity.details.name) {
    details.push(`Name: ${activity.details.name}`)
  } else if (activity.details.sessionId) {
    details.push(`Session: ${activity.details.sessionId}`)
  } else if (typeof activity.details === "string") {
    details.push(activity.details)
  } else {
    try {
      const str = JSON.stringify(activity.details)
      if (str !== "{}") details.push(str)
    } catch (e) {}
  }

  return details.length > 0 ? (
    <div className="space-y-1">
      {details.map((detail, i) => (
        <p key={i} className="text-xs leading-none">
          {detail}
        </p>
      ))}
    </div>
  ) : (
    "-"
  )
}

export default function ActivitiesPage() {
  const router = useRouter()
  const [activities, setActivities] = React.useState<ActivityItem[]>([])
  const [summary, setSummary] = React.useState<ActivitySummary>({
    totalActivities: 0,
    activeUsers: 0,
    sessionsCreated: 0,
    messagesSent: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [mounted, setMounted] = React.useState(false)
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  React.useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress
      let role = (user.publicMetadata?.role as string) || "user"
      
      if (email && email.toLowerCase() === 'maruise237@gmail.com') {
        role = 'admin'
      }
      
      if (role !== "admin") {
        router.push("/")
      }
    }
  }, [isLoaded, user, router])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const fetchActivities = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const [activitiesData, summaryData] = await Promise.all([
        api.activities.list(token || undefined),
        api.activities.summary(7, token || undefined)
      ])
      
      setActivities(activitiesData || [])
      if (summaryData && summaryData.data) {
        setSummary(summaryData.data)
      } else if (summaryData) {
        setSummary(summaryData)
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error)
      toast.error("Failed to load activities")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [fetchActivities])

  return (
    <div className="space-y-10 pb-10">
      {/* Header Section - Modern SaaS Style */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 bg-white/80 dark:bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -ml-32 -mb-32 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="space-y-4 relative z-10 w-full lg:w-auto">
          <div className="flex items-center gap-4 sm:gap-5 flex-wrap">
            <div className="p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20 shadow-sm group-hover:scale-110 transition-transform duration-200">
              <History className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="text-2xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
                Activités
              </h1>
              <div className="flex items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="font-bold text-[8px] sm:text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border-2 bg-background/50 border-primary/10 text-primary shadow-sm">
                  {activities.length} TOTAL
                </Badge>
                <div className="h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full bg-primary/30" />
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Audit System</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-[10px] sm:text-sm font-medium leading-relaxed max-w-xl opacity-80 hidden sm:block">
            Suivi en temps réel de toutes les actions et événements système pour une transparence totale.
          </p>
        </div>

        <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto">
          <Button 
            onClick={() => fetchActivities()} 
            className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 rounded-lg text-[9px] sm:text-[10px] gap-2 sm:gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90 border border-white/10 text-white" 
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span>Actualiser</span>
          </Button>
        </div>
      </div>

      {isLoading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="rounded-lg border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors duration-200" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-4 sm:p-6 relative z-10">
              <CardTitle className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Activités</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 group-hover:scale-110 transition-transform duration-200">
                <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 relative z-10">
              <div className="text-2xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{summary.totalActivities}</div>
              <p className="text-[7px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">7 jours</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-lg border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors duration-200" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-4 sm:p-6 relative z-10">
              <CardTitle className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Actifs</CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:scale-110 transition-transform duration-200">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 relative z-10">
              <div className="text-2xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{summary.activeUsers}</div>
              <p className="text-[7px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">Uniques</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-amber-500/10 transition-colors duration-200" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-4 sm:p-6 relative z-10">
              <CardTitle className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Sessions</CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 group-hover:scale-110 transition-transform duration-200">
                <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 relative z-10">
              <div className="text-2xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{summary.sessionsCreated}</div>
              <p className="text-[7px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">Total</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-slate-200 dark:border-primary/5 bg-white/80 dark:bg-card/80 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-200 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors duration-200" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-4 sm:p-6 relative z-10">
              <CardTitle className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Messages</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 group-hover:scale-110 transition-transform duration-200">
                <Send className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 relative z-10">
              <div className="text-2xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{summary.messagesSent}</div>
              <p className="text-[7px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">Envoyés</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-lg border border-slate-200 dark:border-primary/5 shadow-2xl overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl relative group/card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
        <CardHeader className="bg-white/50 dark:bg-primary/[0.02] border-b border-slate-100 dark:border-primary/5 p-6 sm:p-10 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="p-2.5 sm:p-3.5 bg-primary/10 rounded-lg border border-primary/20 shadow-sm group-hover/card:scale-110 transition-transform duration-200">
                <History className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Journal</CardTitle>
                <CardDescription className="font-bold text-[8px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 leading-relaxed">
                  Audit des opérations
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-500/80">Live Tracking</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative z-10">
          {isLoading ? <TableSkeleton rows={10} cols={5} /> : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-primary/10">
                <Table>
                  <TableHeader className="bg-slate-50/30 dark:bg-primary/[0.01]">
                    <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-primary/5">
                      <TableHead className="w-[200px] font-black uppercase tracking-[0.2em] text-[10px] py-6 pl-10 text-muted-foreground/60">Horodatage</TableHead>
                      <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] py-6 text-muted-foreground/60">Utilisateur</TableHead>
                      <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] py-6 text-muted-foreground/60">Action & Type</TableHead>
                      <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] py-6 text-muted-foreground/60">Ressource</TableHead>
                      <TableHead className="min-w-[250px] font-black uppercase tracking-[0.2em] text-[10px] py-6 text-muted-foreground/60">Détails</TableHead>
                      <TableHead className="hidden md:table-cell font-black uppercase tracking-[0.2em] text-[10px] py-6 text-muted-foreground/60">IP</TableHead>
                      <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] py-6 pr-10 text-right text-muted-foreground/60">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-6 opacity-20">
                            <div className="p-6 bg-slate-100 dark:bg-primary/5 rounded-lg">
                              <History className="w-16 h-16" />
                            </div>
                            <p className="font-black uppercase tracking-[0.3em] text-xs">Aucun enregistrement</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      activities.map((activity, index) => (
                        <TableRow key={index} className="group hover:bg-slate-50/50 dark:hover:bg-primary/[0.02] transition-all duration-200 border-b border-slate-50 dark:border-primary/5 last:border-0">
                          <TableCell className="py-6 pl-10">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-black font-mono text-slate-900 dark:text-slate-200">
                                {mounted ? new Date(activity.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--/--/----'}
                              </span>
                              <span className="text-[10px] font-bold font-mono text-muted-foreground/40">
                                {mounted ? new Date(activity.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary transition-all duration-200">
                                {activity.userEmail?.substring(0, 2).toUpperCase() || "SY"}
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{activity.userEmail}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-slate-100 dark:bg-primary/5 rounded-lg group-hover:scale-110 transition-transform duration-200 border border-transparent group-hover:border-primary/10">
                                {getActionIcon(activity.action)}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100">
                                {formatAction(activity.action)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 dark:bg-muted/50 rounded-lg opacity-70">
                                  {getResourceIcon(activity.resource)}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{activity.resource}</span>
                              </div>
                              {activity.resourceId && (
                                <span className="text-[9px] text-primary/60 font-mono font-bold uppercase tracking-tighter bg-primary/5 px-2 py-1 rounded-lg w-fit border border-primary/10">
                                  {activity.resourceId}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] py-6">
                            <div className="text-[11px] text-muted-foreground/70 font-medium leading-relaxed group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                              {formatDetails(activity)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-6">
                            <span className="font-mono text-[10px] font-black text-muted-foreground/30 bg-slate-50 dark:bg-muted/20 px-2 py-1 rounded-lg">
                              {activity.ip || "0.0.0.0"}
                            </span>
                          </TableCell>
                          <TableCell className="py-6 pr-10 text-right">
                            <Badge
                              className={cn(
                                "font-black uppercase tracking-[0.2em] text-[9px] px-4 py-1.5 rounded-lg shadow-sm border-2 transition-all duration-200",
                                activity.success 
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white" 
                                  : "bg-red-500/10 text-red-600 border-red-500/20 group-hover:bg-red-500 group-hover:text-white"
                              )}
                            >
                              {activity.success ? "Succès" : "Échec"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-primary/5">
                {activities.length === 0 ? (
                  <div className="p-10 text-center opacity-20">
                    <History className="w-10 h-10 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Aucun enregistrement</p>
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div key={index} className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 dark:bg-primary/5 rounded-lg border border-primary/10">
                            {getActionIcon(activity.action)}
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                              {formatAction(activity.action)}
                            </div>
                            <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40">
                              {mounted ? new Date(activity.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "font-black uppercase tracking-[0.2em] text-[7px] px-2 py-1 rounded-md border shadow-sm",
                            activity.success 
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/10" 
                              : "bg-red-500/10 text-red-600 border-red-500/10"
                          )}
                        >
                          {activity.success ? "OK" : "KO"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest">Utilisateur</div>
                          <div className="text-[9px] font-bold truncate text-slate-700 dark:text-slate-300">{activity.userEmail}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest">Ressource</div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase">{activity.resource}</span>
                            {activity.resourceId && (
                              <span className="text-[7px] font-mono font-black text-primary/60 bg-primary/5 px-1 rounded truncate max-w-[50px]">
                                {activity.resourceId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-muted/10 p-3 rounded-lg border border-slate-100 dark:border-primary/5">
                        <div className="text-[7px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1.5">Détails</div>
                        <div className="text-[9px] font-medium leading-relaxed text-muted-foreground">
                          {formatDetails(activity)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
