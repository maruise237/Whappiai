"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Shield,
  Search,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Users
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { toast } from "sonner"
import { cn, ensureString, safeRender } from "@/lib/utils"

function GroupModerationContent() {
  const router = useRouter()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [groups, setGroups] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  const fetchGroups = React.useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getGroups(sessionId, token || undefined)
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) {
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

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement...</div>
  if (!sessionId) return <div className="p-12 text-center text-muted-foreground">Session non trouv&eacute;e</div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">S&eacute;curit&eacute; des Groupes</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(group => (
          <Card key={ensureString(group.id)} className="group hover:border-primary/30 transition-all shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-sm truncate">{safeRender(group.subject || group.name)}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-xs">Mod&eacute;ration Active</span>
                  <Switch checked={true} />
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
