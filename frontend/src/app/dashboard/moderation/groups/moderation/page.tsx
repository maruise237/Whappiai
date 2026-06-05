"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Link2,
  MessageSquareText
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { toast } from "sonner"
import { ensureString, safeRender } from "@/lib/utils"

type GroupItem = {
  id?: string
  subject?: string
  name?: string
  [key: string]: unknown
}

function GroupModerationContent() {
  const router = useRouter()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [groups, setGroups] = React.useState<GroupItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  const fetchGroups = React.useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getGroups(sessionId, token || undefined)
      setGroups(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [sessionId, getToken])

  React.useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const filtered = groups.filter(g =>
    ensureString(g.subject || g.name).toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin opacity-30" />
    </div>
  )
  if (!sessionId) return <div className="p-12 text-center text-muted-foreground">Session non trouv&eacute;e</div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Anti-spam &amp; r&egrave;gles</h1>
            <p className="text-xs text-muted-foreground">Activez une protection de base sur vos groupes WhatsApp.</p>
          </div>
        </div>
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Chercher..."
            className="pl-8 h-8 text-[11px] bg-muted/20 border-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-primary/10 bg-primary/[0.03] shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold">R&egrave;gle conseill&eacute;e pour commencer</p>
            <p className="text-xs text-muted-foreground">Anti-liens + avertissement doux : assez fort pour calmer le groupe, assez simple pour &ecirc;tre accept&eacute;.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium">
              <Link2 className="h-3 w-3 text-primary" /> Anti-liens
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium">
              <ShieldAlert className="h-3 w-3 text-primary" /> Avertir
            </span>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted/20 bg-muted/5 py-16 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">Aucun groupe trouv&eacute;</p>
          <p className="max-w-sm text-xs text-muted-foreground">Ajoutez cette session dans un groupe WhatsApp, donnez-lui le r&ocirc;le admin, puis revenez activer les r&egrave;gles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(group => (
            <Card key={ensureString(group.id)} className="group shadow-sm transition-all hover:border-primary/30">
              <CardHeader className="p-4">
                <CardTitle className="truncate text-sm">{safeRender(group.subject || group.name, "Groupe sans nom")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                  <span className="text-xs font-medium">Protection de base</span>
                  <Switch defaultChecked aria-label="Protection de base active" />
                </div>
                <div className="grid gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
                    <Link2 className="h-3.5 w-3.5 text-primary" /> Anti-liens recommand&eacute;
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5">
                    <MessageSquareText className="h-3.5 w-3.5 text-primary" /> Message de bienvenue pr&ecirc;t &agrave; ajouter
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GroupModerationPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <GroupModerationContent />
    </React.Suspense>
  )
}
