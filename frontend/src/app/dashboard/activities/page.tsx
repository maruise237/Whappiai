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
      setActivities(Array.isArray(activitiesData) ? activitiesData : [])
      setSummary((prev: any) => summaryData?.data || summaryData || prev)
    } catch (error: any) {
      toast.error("Échec du chargement des activités: " + (error.message || "Erreur inconnue"))
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [fetchActivities])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold">Activités</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Journal Système & Audit</p>
        </div>
        <Button size="sm" className="w-full sm:w-auto h-8 text-[11px] font-bold uppercase tracking-widest" onClick={() => fetchActivities()} disabled={isLoading}>
          <RefreshCcw className={cn("h-3.5 w-3.5 mr-1.5", isLoading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="Total Activités" value={summary.totalActivities} />
        <StatCard label="Utilisateurs Actifs" value={summary.activeUsers} />
        <StatCard label="Sessions" value={summary.sessionsCreated} />
        <StatCard label="Messages" value={summary.messagesSent} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center gap-4">
            <CardTitle className="text-sm font-medium">Journal d'activité</CardTitle>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-xs text-muted-foreground">En direct</span>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium text-muted-foreground whitespace-nowrap">Horodatage</TableHead>
              <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground">Utilisateur</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Action</TableHead>
              <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground">Ressource</TableHead>
              <TableHead className="hidden lg:table-cell text-xs font-medium text-muted-foreground">Détails</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!Array.isArray(activities) || activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center py-12">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="text-sm font-medium mb-1">Aucune activité trouvée</h3>
                  <p className="text-xs text-muted-foreground">Tous les événements système apparaîtront ici.</p>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((a, i) => (
                <TableRow key={i} className="hover:bg-muted/50">
                  <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                    {a?.timestamp ? new Date(a.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Date inconnue'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{a?.userEmail || 'Inconnu'}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium uppercase tracking-wider">{String(a?.action || 'Action').replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-[10px] font-medium uppercase">{a?.resource || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">
                    {a?.details ? JSON.stringify(a.details) : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={a?.success
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                    }>
                      {a?.success ? "Succès" : "Erreur"}
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
    <Card className="shadow-none border-border/50">
      <CardContent className="p-3 sm:p-6">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
        <p className="text-lg sm:text-2xl font-black mt-1 text-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}
