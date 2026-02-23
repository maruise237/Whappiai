"use client"

import * as React from "react"
import Link from "next/link"
import { 
  Bot, 
  Settings2, 
  Activity,
  MessageSquare,
  Save,
  MoreVertical,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useUser, useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

export default function AIPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [items, setItems] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)
  const [availableModels, setAvailableModels] = React.useState<any[]>([])
  const [isAdmin, setIsAdmin] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    sessionId: "",
    enabled: false,
    mode: "bot",
    model: "deepseek-chat",
    endpoint: "",
    key: "",
    prompt: ""
  })

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const email = user?.primaryEmailAddress?.emailAddress
      setIsAdmin(email?.toLowerCase() === 'maruise237@gmail.com' || (user?.publicMetadata?.role === 'admin'))

      const models = await api.ai.listModels(token || undefined)
      setAvailableModels(models || [])
      const defaultModel = models?.find((m: any) => m.is_default) || models?.[0]

      const sessionsData = await api.sessions.list(token || undefined)
      const sessions = sessionsData || []
      
      const itemsWithConfig = await Promise.all(sessions.map(async (s: any) => {
        try {
          const config = await api.sessions.getAI(s.sessionId, token || undefined)
          return {
            sessionId: s.sessionId,
            isConnected: s.isConnected,
            aiConfig: {
              ...config,
              model: config.model || defaultModel?.id || "deepseek-chat",
              endpoint: config.endpoint || defaultModel?.endpoint || ""
            }
          }
        } catch (e) {
          return {
            sessionId: s.sessionId,
            isConnected: s.isConnected,
            aiConfig: { enabled: false, mode: 'bot', model: defaultModel?.id || 'deepseek-chat', prompt: '', endpoint: defaultModel?.endpoint || '', key: '' }
          }
        }
      }))
      setItems(itemsWithConfig)
    } catch (error) {
      toast.error("Échec du chargement des configurations IA")
    } finally {
      setIsLoading(false)
    }
  }, [getToken, user])

  React.useEffect(() => {
    if (isLoaded && user) fetchData()
  }, [isLoaded, user, fetchData])

  const handleOpenQuickEdit = (item: any) => {
    setFormData({
      sessionId: item.sessionId,
      enabled: item.aiConfig.enabled,
      mode: item.aiConfig.mode || "bot",
      model: item.aiConfig.model,
      endpoint: item.aiConfig.endpoint,
      key: item.aiConfig.key || "",
      prompt: item.aiConfig.prompt || ""
    })
    setIsQuickEditOpen(true)
  }

  const handleSave = async () => {
    try {
      const token = await getToken()
      await api.sessions.updateAI(formData.sessionId, formData, token || undefined)
      toast.success("Configuration IA mise à jour")
      setIsQuickEditOpen(false)
      fetchData()
      if (formData.enabled) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
    } catch (error: any) {
      toast.error("Échec de l'enregistrement")
    }
  }

  const toggleAI = async (item: any) => {
    try {
      const token = await getToken()
      await api.sessions.updateAI(item.sessionId, { ...item.aiConfig, enabled: !item.aiConfig.enabled }, token || undefined)
      toast.success(`Assistant IA ${!item.aiConfig.enabled ? 'activé' : 'désactivé'}`)
      fetchData()
    } catch (error) {
      toast.error("Échec de la modification")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Assistant IA</h1>
          <p className="text-sm text-muted-foreground">Configurez l&apos;automatisation intelligente pour vos sessions.</p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/ai-models">Gérer les modèles</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/20" />)
        ) : items.length === 0 ? (
          <Card className="col-span-full py-12 text-center border-dashed">
            <Bot className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">Aucune session trouvée</p>
            <p className="text-xs text-muted-foreground">Connectez un compte WhatsApp pour activer l'IA.</p>
          </Card>
        ) : (
          items.map(item => (
            <Card key={item.sessionId} className="border-border bg-card overflow-hidden">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", item.aiConfig.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.sessionId}</p>
                    <Badge variant="outline" className="text-[10px] uppercase">{item.aiConfig.mode}</Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenQuickEdit(item)}>
                      <Settings2 className="h-4 w-4 mr-2" /> Modification rapide
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/ai/config?session=${item.sessionId}`}>
                        <Zap className="h-4 w-4 mr-2" /> Config avancée
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground line-clamp-2 border-l-2 border-primary/40 min-h-[48px]">
                  {item.aiConfig.prompt || "Aucune instruction configurée"}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Envoyés</span>
                  <span className="font-semibold text-foreground">{item.aiConfig.stats?.sent || 0} messages</span>
                </div>
              </CardContent>
              <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{item.aiConfig.enabled ? "IA Active" : "IA Inactive"}</span>
                <Switch checked={item.aiConfig.enabled} onCheckedChange={() => toggleAI(item)} />
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modification rapide de l&apos;IA</DialogTitle>
            <DialogDescription>Ajustez les paramètres IA pour {formData.sessionId}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Activé</p>
                <p className="text-xs text-muted-foreground">Réponses automatiques actives</p>
              </div>
              <Switch checked={formData.enabled} onCheckedChange={c => setFormData({...formData, enabled: c})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase">Mode de réponse</Label>
              <Select value={formData.mode} onValueChange={v => setFormData({...formData, mode: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot">Bot (100% Auto)</SelectItem>
                  <SelectItem value="hybrid">Hybride (Délai)</SelectItem>
                  <SelectItem value="human">Humain (Suggestion)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase">Modèle</Label>
              <Select value={formData.model} onValueChange={v => {
                const m = availableModels.find(mod => mod.id === v);
                setFormData({...formData, model: v, endpoint: m?.endpoint || ""})
              }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" asChild className="flex-1">
              <Link href={`/dashboard/ai/config?session=${formData.sessionId}`}>Config avancée</Link>
            </Button>
            <Button onClick={handleSave} className="flex-1">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
