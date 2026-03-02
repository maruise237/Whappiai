"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Search,
  Smartphone,
  Info,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { useWebSocket } from "@/providers/websocket-provider"
import { toast } from "sonner"
import { cn, ensureString, safeRender } from "@/lib/utils"

export default function ModerationPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  const fetchSessions = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement des sessions")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Real-time updates via WebSocket
  React.useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'session-update') {
      const updates = Array.isArray(lastMessage.data) ? lastMessage.data : [lastMessage.data];

      setSessions(prev => {
        const newSessions = [...prev];
        let hasChanges = false;

        updates.forEach(update => {
          const index = newSessions.findIndex(s => ensureString(s.sessionId) === ensureString(update.sessionId));
          if (index !== -1) {
            newSessions[index] = {
              ...newSessions[index],
              ...update,
              isConnected: update.status === 'CONNECTED'
            };
            hasChanges = true;
          }
        });

        return hasChanges ? newSessions : prev;
      });
    }

    if (lastMessage.type === 'session-deleted') {
      const { sessionId } = lastMessage.data;
      setSessions(prev => prev.filter(s => ensureString(s.sessionId) !== ensureString(sessionId)));
    }
  }, [lastMessage]);

  const filtered = (Array.isArray(sessions) ? sessions : []).filter(s =>
    ensureString(s.sessionId).toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-black tracking-[0.2em] px-2 h-5">
            Sécurité & Modération
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Groupes</h1>
          <p className="text-sm text-muted-foreground max-w-md">Administrez vos communautés WhatsApp avec la puissance de l&apos;IA et des outils de modération avancés.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Rechercher une session..."
            className="pl-10 h-10 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Info className="h-4 w-4 text-emerald-600" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-bold text-foreground">Note importante :</span> La modération automatique nécessite que votre compte WhatsApp dispose des privilèges <span className="text-emerald-600 font-bold">Administrateur</span> dans les groupes cibles.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted/20 border-none" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed rounded-3xl border-muted/20 bg-muted/5">
           <div className="h-20 w-20 rounded-full bg-muted/10 flex items-center justify-center mb-6">
             <ShieldAlert className="h-10 w-10 text-muted-foreground/30" />
           </div>
           <h3 className="text-lg font-bold mb-2">Aucune session active</h3>
           <p className="text-sm text-muted-foreground max-w-xs mb-8">Connectez un compte WhatsApp depuis votre tableau de bord pour commencer à gérer vos groupes.</p>
           <Button size="lg" className="rounded-full px-8" onClick={() => router.push('/dashboard')}>
              Retour au Dashboard
           </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(session => (
            <Card key={ensureString(session.sessionId)} className="group hover:border-primary/40 transition-all shadow-none border-border/40 bg-card/50 overflow-hidden relative">
              <div className={cn(
                "absolute top-0 left-0 w-1 h-full",
                session.isConnected ? "bg-emerald-500" : "bg-amber-500"
              )} />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-black uppercase tracking-widest border-none px-2 py-1",
                    session.isConnected
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {session.isConnected ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="space-y-1 mb-6">
                  <p className="text-lg font-bold truncate tracking-tight">{safeRender(session.sessionId)}</p>
                  <p className="text-xs text-muted-foreground font-medium">Instance WhatsApp Active</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="w-full h-10 text-[11px] font-bold uppercase tracking-widest border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all rounded-lg"
                    onClick={() => router.push(`/dashboard/moderation/groups/moderation?sessionId=${safeRender(session.sessionId)}`)}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" /> Sécurité
                  </Button>
                  <Button
                    className="w-full h-10 text-[11px] font-bold uppercase tracking-widest shadow-none rounded-lg"
                    onClick={() => router.push(`/dashboard/moderation/groups/engagement?sessionId=${safeRender(session.sessionId)}`)}
                  >
                    Engagement <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
