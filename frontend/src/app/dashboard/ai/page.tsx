"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Brain,
  Search,
  Settings2,
  Smartphone,
  MoreVertical,
  Sparkles,
  Loader2,
  Bot,
  Cpu,
  ChevronRight,
  User,
  Zap,
  CheckCircle2,
  Settings
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { MagicOnboardingWizard } from "@/components/dashboard/MagicOnboardingWizard"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function AssistantIAPageContent() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [sessions, setSessions] = React.useState<any[]>([])
  const [aiConfigs, setAiConfigs] = React.useState<Record<string, any>>({})
  const [models, setModels] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [showWizard, setShowWizard] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const [sessionsData, modelsData] = await Promise.all([
        api.sessions.list(token || undefined),
        api.ai.listModels(token || undefined)
      ])

      setSessions(sessionsData || [])
      setModels(modelsData || [])

      // Fetch AI configs for each session in parallel
      const configs: Record<string, any> = {}
      const configResults = await Promise.all(
        (sessionsData || []).map(async (s: any) => {
          try {
            const ai = await api.sessions.getAI(s.sessionId, token || undefined)
            return { sessionId: s.sessionId, ai }
          } catch (e) {
            console.error(`Failed to fetch AI config for session ${s.sessionId}:`, e)
            return { sessionId: s.sessionId, ai: null }
          }
        })
      )

      configResults.forEach(res => {
        if (res.ai) configs[res.sessionId] = res.ai
      })
      setAiConfigs(configs)
    } catch (e) {
      toast.error("Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchData()
    const params = new URLSearchParams(window.location.search)
    if (params.get('cal') === 'success') {
      setShowWizard(true)
    }
  }, [fetchData])

  const handleToggleAI = async (sessionId: string, enabled: boolean) => {
    const config = aiConfigs[sessionId]
    if (!config) return
    try {
      const token = await getToken()
      await api.sessions.updateAI(sessionId, { ...config, enabled }, token || undefined)
      setAiConfigs(prev => ({ ...prev, [sessionId]: { ...config, enabled } }))
      toast.success(enabled ? "IA activée" : "IA désactivée")
    } catch (e) {
      toast.error("Erreur")
    }
  }

  const filtered = sessions.filter(s => s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()))
  const isAdmin = user?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

  const [adminStats, setAdminStats] = React.useState<any>(null)

  const fetchAdminStats = React.useCallback(async () => {
    if (!isAdmin) return
    try {
        const token = await getToken()
        const stats = await api.admin.getStats(7, token || undefined)
        setAdminStats(stats)
    } catch (e) { console.error(e) }
  }, [isAdmin, getToken])

  React.useEffect(() => {
    fetchAdminStats()
  }, [fetchAdminStats])

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Assistant IA
          </h1>
          <p className="text-sm text-muted-foreground">Pilotez l&apos;intelligence de vos sessions WhatsApp.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {isAdmin && (
                <Button variant="outline" size="sm" className="h-8 rounded-full flex-1 sm:flex-none px-4" onClick={() => router.push('/dashboard/ai-models')}>
                <Settings className="h-3 w-3 mr-2" /> Gérer les modèles
                </Button>
            )}
            {sessions.length > 0 && (
                <MagicOnboardingWizard
                sessionId={sessions[0].sessionId}
                onComplete={fetchData}
                defaultOpen={showWizard}
                />
            )}
          </div>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Chercher..."
              className="pl-8 h-8 text-[11px] bg-muted/20 border-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(session => {
            const config = aiConfigs[session.sessionId]
            const modelName = models.find(m => m.id === config?.model)?.name || config?.model || 'Whappi AI'
            return (
              <Card key={session.sessionId} className="group hover:border-primary/30 transition-all shadow-sm flex flex-col">
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-sm font-bold truncate">{session.sessionId}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        "text-[9px] font-semibold border-none h-4 px-1.5",
                        session.isConnected
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {session.isConnected ? "Live" : "Offline"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-semibold text-muted-foreground h-4 px-1.5 border-muted-foreground/20">
                        {config?.mode || 'bot'}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingSessionId(session.sessionId); setIsEditDialogOpen(true); }} className="text-xs">
                        <Settings2 className="h-3.5 w-3.5 mr-2" /> Quick Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/ai/config?sessionId=${session.sessionId}`)} className="text-xs">
                        <Brain className="h-3.5 w-3.5 mr-2" /> Config Avancée
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4 flex-1">
                   {/* Prompt Preview (Bulle subtile) */}
                   <div className="rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground line-clamp-2 border-l-2 border-primary/40 italic leading-relaxed">
                      {config?.prompt || "Aucun prompt configuré"}
                   </div>

                   <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-muted/20 border border-muted/30">
                         <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">Modèle</p>
                         <p className="text-[10px] font-semibold truncate">{modelName}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/20 border border-muted/30">
                         <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">Usage IA</p>
                         <p className="text-[10px] font-semibold">{(config?.stats?.sent || 0) + (config?.stats?.received || 0)} msg</p>
                      </div>
                   </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 border-t border-muted/30 flex items-center justify-between bg-muted/5">
                   <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">Intelligence Active</span>
                   <Switch
                     checked={!!config?.enabled}
                     onCheckedChange={(v) => handleToggleAI(session.sessionId, v)}
                     size="sm"
                   />
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Quick Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Configuration IA Rapide</DialogTitle>
            <DialogDescription className="text-xs">Ajustez les paramètres essentiels de {editingSessionId}.</DialogDescription>
          </DialogHeader>
          {editingSessionId && aiConfigs[editingSessionId] && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Activation Intelligence</Label>
                <Switch
                  checked={!!aiConfigs[editingSessionId].enabled}
                  onCheckedChange={(v) => handleToggleAI(editingSessionId, v)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-muted-foreground">Mode</Label>
                <Select
                  value={aiConfigs[editingSessionId].mode || "bot"}
                  onValueChange={(v) => {
                    setAiConfigs(prev => ({ ...prev, [editingSessionId]: { ...prev[editingSessionId], mode: v } }))
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bot">Automatique (Bot)</SelectItem>
                    <SelectItem value="human">Suggestion (Humain)</SelectItem>
                    <SelectItem value="keyword">Mots-clés uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-muted-foreground">Modèle LLM</Label>
                <Select
                  value={aiConfigs[editingSessionId].model || (models.find(m => m.is_default)?.id || "deepseek-chat")}
                  onValueChange={(v) => {
                    setAiConfigs(prev => ({ ...prev, [editingSessionId]: { ...prev[editingSessionId], model: v } }))
                  }}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {models.length === 0 ? (
                      <SelectItem value="deepseek-chat">Whappi AI (Défaut)</SelectItem>
                    ) : (
                      models.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="link"
                size="sm"
                className="w-full text-xs h-auto p-0 text-primary font-bold"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  router.push(`/dashboard/ai/config?sessionId=${editingSessionId}`);
                }}
              >
                Accéder à la configuration avancée <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}
          <DialogFooter>
             <Button variant="ghost" size="sm" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
             <Button size="sm" onClick={async () => {
                if (editingSessionId) {
                  const token = await getToken();
                  await api.sessions.updateAI(editingSessionId, aiConfigs[editingSessionId], token || undefined);
                  toast.success("Enregistré");
                  setIsEditDialogOpen(false);
                }
             }}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AssistantIAPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <AssistantIAPageContent />
    </React.Suspense>
  )
}
