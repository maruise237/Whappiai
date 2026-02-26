"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Search,
  Settings2,
  Users,
  Smartphone,
  ChevronRight,
  Info,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ModerationPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  const fetchSessions = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
    } catch (e) {
      toast.error("Erreur de chargement des sessions")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filtered = sessions.filter(s => s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Gestion des Groupes
          </h1>
          <p className="text-sm text-muted-foreground">Sélectionnez une session pour administrer ses groupes.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une session..."
            className="pl-8 h-9 text-xs bg-muted/20 border-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">La modération ne s&apos;applique qu&apos;aux groupes où le compte WhatsApp est <b>Administrateur</b>.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/20" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl border-muted/20 bg-muted/5">
           <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mb-3" />
           <p className="text-sm font-medium">Aucune session active</p>
           <p className="text-xs text-muted-foreground max-w-xs">Connectez un compte WhatsApp pour commencer la modération.</p>
           <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => router.push('/dashboard')}>
              Tableau de bord
           </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(session => (
            <Card key={session.sessionId} className="group hover:border-primary/30 transition-all shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <Badge className={cn(
                    "text-[9px] font-semibold border-none",
                    session.isConnected
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {session.isConnected ? "Connecté" : "Hors-ligne"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold truncate">{session.sessionId}</p>
                  <p className="text-xs text-muted-foreground">Session WhatsApp active</p>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] font-semibold tracking-wider"
                  onClick={() => router.push(`/dashboard/moderation/groups/moderation?sessionId=${session.sessionId}`)}
                >
                  <ShieldCheck className="h-3 w-3 mr-1.5" /> Sécurité
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-[10px] font-semibold tracking-wider"
                  onClick={() => router.push(`/dashboard/moderation/groups/engagement?sessionId=${session.sessionId}`)}
                >
                  <Users className="h-3 w-3 mr-1.5" /> Engagement
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
