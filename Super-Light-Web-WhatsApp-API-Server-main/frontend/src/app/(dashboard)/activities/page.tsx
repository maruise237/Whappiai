"use client"

import * as React from "react"
import {
  Activity,
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
  const [activities, setActivities] = React.useState<ActivityItem[]>([])
  const [summary, setSummary] = React.useState<ActivitySummary>({
    totalActivities: 0,
    activeUsers: 0,
    sessionsCreated: 0,
    messagesSent: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchActivities = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [activitiesData, summaryData] = await Promise.all([
        api.activities.list(),
        api.activities.summary(7)
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Activities</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => fetchActivities()} variant="outline" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalActivities}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Unique active users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions Created</CardTitle>
            <PlusCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.sessionsCreated}</div>
            <p className="text-xs text-muted-foreground">Total sessions initiated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.messagesSent}</div>
            <p className="text-xs text-muted-foreground">Successfully sent</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Real-time monitoring of all system actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="min-w-[200px]">Details</TableHead>
                  <TableHead className="hidden md:table-cell">IP Address</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading activities...
                    </TableCell>
                  </TableRow>
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No activities found.
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs font-mono" suppressHydrationWarning>
                        {new Date(activity.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{activity.userEmail}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(activity.action)}
                          <span className="text-sm font-medium">
                            {formatAction(activity.action)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {getResourceIcon(activity.resource)}
                            <span className="text-sm">{activity.resource}</span>
                          </div>
                          {activity.resourceId && (
                            <span className="text-[10px] text-muted-foreground font-mono mt-1">
                              {activity.resourceId}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {formatDetails(activity)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">
                        {activity.ip || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={activity.success ? "default" : "destructive"}
                          className={activity.success ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {activity.success ? "Success" : "Failed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
