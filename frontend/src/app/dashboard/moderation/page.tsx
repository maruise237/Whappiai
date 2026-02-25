"use client"

import * as React from "react"
import { 
  Shield, 
  Search, 
  ShieldAlert,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"

export default function ModerationSessionsPage() {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()

  const fetchSessions = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
    } catch (error) {
      toast.error("Échec du chargement des sessions")
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filteredSessions = Array.isArray(sessions) ? sessions.filter(s =>
    s && s.sessionId && s.sessionId.toLowerCase().includes(searchQuery.toLowerCase())
  ) : []

  if (isLoading) return <div className="p-8 text-center">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold">Gestion des Groupes</h1>
          <p className="text-sm text-muted-foreground">Sélectionnez une session pour gérer vos groupes.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher une session..."
            className="pl-9 h-9 text-xs w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground">Sélectionnez une session connectée pour accéder aux groupes dont vous êtes administrateur.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {filteredSessions.length === 0 ? (
          <Card className="col-span-full py-12 text-center border-dashed">
            <Zap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">Aucune session trouvée</p>
          </Card>
        ) : (
          filteredSessions.map(session => (
            <Card key={session.sessionId} className="border-border/50 bg-card overflow-hidden shadow-none flex flex-col">
              <CardHeader className="p-4 sm:p-6 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center", session.isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{session.sessionId}</p>
                    <Badge className={cn(
                      "text-[9px] uppercase font-bold tracking-widest px-1.5 h-4 shadow-none",
                      session.isConnected
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {session.isConnected ? "Connectée" : "Hors ligne"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="p-4 sm:p-6 bg-muted/10 border-t grid grid-cols-2 gap-3">
                <Button size="sm" variant="outline" disabled={!session.isConnected} onClick={() => router.push(`/dashboard/moderation/groups/moderation?session=${session.sessionId}`)}>
                  Modération
                </Button>
                <Button size="sm" variant="outline" disabled={!session.isConnected} onClick={() => router.push(`/dashboard/moderation/groups/animation?session=${session.sessionId}`)}>
                  Animation
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
