"use client"

import * as React from "react"
import { History, RefreshCcw, Activity, Users, Send, PlusCircle, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useUser, useAuth } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

export default function ActivitiesPage() {
  const router = useRouter()
  const [activities, setActivities] = React.useState<any[]>([])
  const [summary, setSummary] = React.useState<any>({
    totalActivities: 0,
    activeUsers: 0,
    sessionsCreated: 0,
    messagesSent: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  React.useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress
      let role = (user.publicMetadata?.role as string) || "user"
      if (email?.toLowerCase() === 'maruise237@gmail.com') role = 'admin'
      if (role !== "admin") router.push("/")
    }
  }, [isLoaded, user, router])

  const fetchActivities = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const [activitiesData, summaryData] = await Promise.all([
        api.activities.list(token || undefined),
        api.activities.summary(7, token || undefined)
      ])
      setActivities(activitiesData || [])
      setSummary(summaryData?.data || summaryData || summary)
    } catch (error) {
      toast.error("Failed to load activities")
    } finally {
      setIsLoading(false)
    }
  }, [getToken, summary])

  React.useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [fetchActivities])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Activities</h1>
          <p className="text-sm text-muted-foreground">Real-time system log and audit trail.</p>
        </div>
        <Button size="sm" onClick={() => fetchActivities()} disabled={isLoading}>
          <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Activities" value={summary.totalActivities} />
        <StatCard label="Active Users" value={summary.activeUsers} />
        <StatCard label="Sessions" value={summary.sessionsCreated} />
        <StatCard label="Messages" value={summary.messagesSent} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <CardTitle className="text-sm font-medium">Activity Journal</CardTitle>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium text-muted-foreground">Timestamp</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">User</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Action</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Resource</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Details</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center py-12">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="text-sm font-medium mb-1">No activities found</h3>
                  <p className="text-xs text-muted-foreground">All system events will appear here.</p>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((a, i) => (
                <TableRow key={i} className="hover:bg-muted/50">
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(a.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell className="text-sm">{a.userEmail}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium uppercase tracking-wider">{a.action.replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-medium uppercase">{a.resource}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {JSON.stringify(a.details)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={a.success
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                    }>
                      {a.success ? "Success" : "Error"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>
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
