"use client"

import * as React from "react"
import {
  Activity,
  RefreshCcw,
  Search,
  History,
  Clock,
  User,
  Tag,
  MessageSquare,
  ShieldCheck,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ActivitiesPage() {
  const { getToken } = useAuth()
  const [activities, setActivities] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  const fetchActivities = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.activities.list(50, token || undefined)
      setActivities(data || [])
    } catch (e) {
      toast.error("Erreur de chargement du journal")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const filtered = activities.filter(a =>
    a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.resource_id || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getActionIcon = (action: string) => {
    if (action.includes('send')) return <MessageSquare className="h-3 w-3" />
    if (action.includes('moderation') || action.includes('block')) return <ShieldCheck className="h-3 w-3" />
    if (action.includes('error')) return <AlertCircle className="h-3 w-3 text-destructive" />
    return <Activity className="h-3 w-3" />
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Journal Activités
          </h1>
          <p className="text-sm text-muted-foreground">Historique complet des actions du système.</p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchActivities} disabled={loading} className="rounded-full h-8">
          <RefreshCcw className={cn("h-3 w-3 mr-2", loading && "animate-spin")} /> Rafraîchir
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une action ou une ressource..."
            className="pl-8 h-9 text-xs bg-muted/20 border-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">Live Tracking</span>
        </div>
      </div>

      <Card className="border-none shadow-none bg-muted/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-muted/30">
              <TableHead className="text-[10px] font-semibold text-muted-foreground w-[180px]">Date & Heure</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground">Action</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground">Ressource</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground">Détails</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-muted/20">
                  <TableCell colSpan={5} className="h-12 bg-muted/5"></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs italic">
                  Aucune activité trouvée.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((activity) => (
                <TableRow key={activity.id} className="border-muted/20 hover:bg-muted/30 transition-colors group">
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 opacity-40" />
                      {new Date(activity.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                        {getActionIcon(activity.action)}
                      </div>
                      <span className="text-xs font-semibold capitalize">{activity.action.replace(/_/g, ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono border-muted/50 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary transition-colors">
                      {activity.resource_id || 'system'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-[11px] text-muted-foreground truncate">{activity.details || '-'}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={cn(
                      "text-[9px] font-semibold border-none",
                      activity.success === 1 || activity.success === true
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-red-500/10 text-red-700 dark:text-red-400"
                    )}>
                      {activity.success === 1 || activity.success === true ? 'Success' : 'Error'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
