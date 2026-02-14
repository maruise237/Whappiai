"use client"

import * as React from "react"
import Link from "next/link"
import { AITour } from "@/components/dashboard/ai-tour"
import { 
  Bot, 
  Plus, 
  Settings2, 
  Trash2, 
  Activity,
  BrainCircuit,
  MessageSquare,
  Save,
  MoreVertical,
  Zap,
  Sparkles,
  HelpCircle
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

interface AIAutomationItem {
  sessionId: string
  isConnected: boolean
  aiConfig: {
    enabled: boolean
    mode: string
    model: string
    prompt: string
    endpoint: string
    key: string
    stats?: {
      received: number
      sent: number
    }
  }
}

export default function AIPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [items, setItems] = React.useState<AIAutomationItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)
  const [availableModels, setAvailableModels] = React.useState<any[]>([])
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [showTour, setShowTour] = React.useState(false)
  
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
      // Get current user to check if admin
      const userData = await api.auth.check(token || undefined)
      const email = user?.primaryEmailAddress?.emailAddress
      setIsAdmin(userData?.role === 'admin' || (email && email.toLowerCase() === 'maruise237@gmail.com'))

      // Get available global models
      const models = await api.ai.listModels(token || undefined)
      setAvailableModels(models || [])
      const defaultModel = models?.find((m: any) => m.is_default) || models?.[0]

      const sessionsData = await api.sessions.list(token || undefined)
      const sessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData.sessions || [])
      
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
            aiConfig: { 
              enabled: false, 
              mode: 'bot', 
              model: defaultModel?.id || 'deepseek-chat', 
              prompt: '', 
              endpoint: defaultModel?.endpoint || '', 
              key: '' 
            }
          }
        }
      }))
      
      setItems(itemsWithConfig)
    } catch (error) {
      toast.error("Impossible de charger les données")
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    if (isLoaded && user) {
      fetchData()
      
      // Auto-start tour if first time on this page
      const hasSeenAITour = localStorage.getItem("hasSeenAITour")
      if (!hasSeenAITour) {
        const timer = setTimeout(() => setShowTour(true), 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [isLoaded, user, fetchData])

  const handleTourExit = () => {
    setShowTour(false)
    localStorage.setItem("hasSeenAITour", "true")
  }

  const handleOpenQuickEdit = (item: AIAutomationItem) => {
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
      await api.sessions.updateAI(formData.sessionId, {
        enabled: formData.enabled,
        mode: formData.mode,
        model: formData.model,
        endpoint: formData.endpoint,
        key: formData.key,
        prompt: formData.prompt
      }, token || undefined)
      
      if (formData.enabled) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff']
        })
        toast.success("Assistant IA activé et configuré ! 🚀")
      } else {
        toast.success("Configuration enregistrée")
      }
      
      setIsQuickEditOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement")
    }
  }

  const toggleAI = async (item: AIAutomationItem) => {
    try {
      const token = await getToken()
      await api.sessions.updateAI(item.sessionId, {
        ...item.aiConfig,
        enabled: !item.aiConfig.enabled
      }, token || undefined)
      toast.success(`Assistant IA ${!item.aiConfig.enabled ? 'activé' : 'désactivé'}`)
      fetchData()
    } catch (error) {
      toast.error("Erreur lors de la modification")
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <AITour enabled={showTour} onExit={handleTourExit} />
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8 bg-white/80 dark:bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-primary/10 shadow-lg relative overflow-hidden group ai-page-header">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="space-y-4 relative z-10 w-full lg:w-auto">
          <div className="flex items-center gap-4 sm:gap-5 flex-wrap">
            <div className="p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20 shadow-sm group-hover:scale-110 transition-transform duration-200">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-2 sm:gap-4">
                <h1 className="text-2xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
                  Assistant IA
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTour(true)}
                  className="rounded-full h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Démarrer le tour guidé"
                >
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="font-bold text-[8px] sm:text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border-2 bg-background/50 border-primary/10 text-primary shadow-sm">
                  Smart Automation
                </Badge>
                <div className="h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full bg-primary/30" />
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Gérez vos bots</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-[10px] sm:text-sm font-medium leading-relaxed max-w-xl opacity-80 hidden sm:block">
            Transformez vos sessions WhatsApp en centres de support intelligents. Configurez et gérez vos assistants IA pour chaque numéro.
          </p>
        </div>

        {isAdmin && (
          <div className="relative z-10 w-full lg:w-auto">
            <Button 
              asChild
              className="w-full lg:w-auto shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all duration-200 active:scale-95 rounded-lg font-bold uppercase tracking-widest text-[9px] sm:text-[11px] px-6 sm:px-8 h-10 sm:h-12"
            >
              <Link href="/ai-models">
                <Settings2 className="w-4 h-4 mr-2" />
                Configuration Modèles
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i} className="h-80 animate-pulse bg-slate-50 dark:bg-muted/10 border border-slate-200 dark:border-primary/5 rounded-lg" />
          ))
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-24 bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-dashed border-slate-300 dark:border-primary/20 rounded-lg space-y-6">
            <Bot className="w-16 h-16 text-muted-foreground mx-auto opacity-20" />
            <div className="space-y-2">
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Aucune session WhatsApp trouvée.</p>
              <p className="text-[10px] text-muted-foreground opacity-60 uppercase tracking-widest">Connectez un compte WhatsApp pour activer l'IA.</p>
            </div>
          </div>
        ) : (
          items.map((item, index) => (
            <Card 
              key={item.sessionId} 
              className={cn(
                "group hover:shadow-2xl transition-all duration-300 border border-slate-200 dark:border-primary/10 hover:border-primary/30 rounded-lg overflow-hidden bg-white dark:bg-card flex flex-col hover:bg-slate-50/50 dark:hover:bg-primary/5",
                index === 0 && "ai-session-card"
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 p-8 pb-4">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "p-4 rounded-lg transition-all duration-300 group-hover:scale-110 shadow-sm border",
                    item.aiConfig.enabled 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-muted dark:border-primary/5 dark:text-muted-foreground/40"
                  )}>
                    <Bot className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black tracking-tight group-hover:text-primary transition-colors uppercase">
                      {item.sessionId}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={item.aiConfig.enabled ? "default" : "secondary"} 
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg shadow-sm",
                          item.aiConfig.enabled ? "bg-primary text-white" : "bg-slate-200 text-slate-600 dark:bg-muted/50 dark:text-muted-foreground"
                        )}
                      >
                        {item.aiConfig.enabled ? "ACTIF" : "INACTIF"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 px-2 py-0.5 rounded-lg text-muted-foreground">
                        {item.aiConfig.mode}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2 rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl bg-white/95 dark:bg-card/95 backdrop-blur-sm">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">Actions de l'Assistant</DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-primary/5" />
                    <DropdownMenuItem onClick={() => handleOpenQuickEdit(item)} className={cn("cursor-pointer rounded-lg p-3 focus:bg-primary/10 focus:text-primary group/item transition-colors duration-200", index === 0 && "ai-quick-settings")}>
                      <Settings2 className="w-4 h-4 mr-3 text-primary transition-transform duration-200 group-hover/item:rotate-90" />
                      <span className="font-bold uppercase tracking-widest text-[10px]">Réglages Rapides</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={cn("cursor-pointer rounded-lg p-3 focus:bg-amber-500/10 focus:text-amber-500 transition-colors duration-200", index === 0 && "ai-advanced-config")}>
                       <Link href={`/ai/config?session=${item.sessionId}`} className="flex items-center w-full" prefetch={false}>
                        <Zap className="w-4 h-4 mr-3 text-amber-500" />
                        <span className="font-bold uppercase tracking-widest text-[10px]">Configuration IA</span>
                       </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-primary/5" />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg p-3 transition-colors duration-200">
                      <Trash2 className="w-4 h-4 mr-3" />
                      <span className="font-bold uppercase tracking-widest text-[10px]">Réinitialiser</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              
              <CardContent className="space-y-6 p-8 pt-0 flex-1">
                <div className="text-xs font-medium text-muted-foreground bg-slate-50 dark:bg-muted/20 p-6 rounded-lg italic line-clamp-3 min-h-[6rem] border border-transparent group-hover:border-primary/10 transition-all duration-300 leading-relaxed shadow-inner">
                  {item.aiConfig.prompt ? (
                    <span>"{item.aiConfig.prompt}"</span>
                  ) : (
                    <span className="opacity-40 uppercase tracking-widest text-[10px] font-black">Aucune instruction configurée.</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Statistiques</span>
                  </div>
                  {item.aiConfig.stats ? (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className="text-foreground/80">{item.aiConfig.stats.sent} RÉPONSES</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[9px] font-black opacity-40 uppercase tracking-widest">AUCUNE ACTIVITÉ</span>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-8 pt-0 border-t border-slate-100 dark:border-primary/5 bg-slate-50/50 dark:bg-muted/5 flex items-center justify-between mt-auto h-20">
                <Label 
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer opacity-70 hover:opacity-100 transition-opacity duration-200" 
                  htmlFor={`switch-${item.sessionId}`}
                >
                  {item.aiConfig.enabled ? "Désactiver" : "Activer"} l'Assistant
                </Label>
                <Switch 
                  id={`switch-${item.sessionId}`}
                  checked={item.aiConfig.enabled}
                  onCheckedChange={() => toggleAI(item)}
                  className={cn("data-[state=checked]:bg-primary shadow-sm scale-110", index === 0 && "ai-toggle-switch")}
                />
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* QUICK EDIT DIALOG */}
      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl p-0 gap-0 bg-white dark:bg-card/95 backdrop-blur-sm">
          <DialogHeader className="p-8 bg-primary text-white">
            <DialogTitle className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
              <Settings2 className="w-6 h-6" />
              Réglages Rapides
            </DialogTitle>
            <DialogDescription className="text-white/80 font-bold text-[10px] uppercase tracking-widest opacity-90 mt-2">
              Ajustez l'intelligence pour {formData.sessionId}.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between p-6 rounded-lg border border-primary/10 bg-primary/5 shadow-inner">
              <Label htmlFor="quick-enable" className="flex flex-col gap-1 cursor-pointer">
                <span className="font-black uppercase tracking-widest text-xs text-foreground">Statut de l'IA</span>
                <span className="font-bold text-[9px] uppercase tracking-tight text-muted-foreground opacity-60">Réponses automatiques</span>
              </Label>
              <Switch
                id="quick-enable"
                checked={formData.enabled}
                onCheckedChange={(c) => setFormData({...formData, enabled: c})}
                className="data-[state=checked]:bg-primary scale-125"
              />
            </div>
            
            <div className="space-y-4">
              <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground px-1">Mode de réponse</Label>
              <Select 
                value={formData.mode} 
                onValueChange={(v) => setFormData({...formData, mode: v})}
              >
                <SelectTrigger className="h-14 border-2 border-slate-100 dark:border-primary/5 rounded-lg focus:ring-primary/20 font-bold text-[10px] uppercase tracking-widest bg-slate-50 dark:bg-background/50 shadow-inner transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl bg-white dark:bg-card/95 backdrop-blur-sm">
                  <SelectItem value="bot" className="font-bold text-[10px] uppercase tracking-widest py-4 cursor-pointer transition-colors duration-200 focus:bg-primary/10 focus:text-primary">Bot (100% Auto)</SelectItem>
                  <SelectItem value="hybrid" className="font-bold text-[10px] uppercase tracking-widest py-4 cursor-pointer transition-colors duration-200 focus:bg-primary/10 focus:text-primary">Hybride (Délai 5s)</SelectItem>
                  <SelectItem value="human" className="font-bold text-[10px] uppercase tracking-widest py-4 cursor-pointer transition-colors duration-200 focus:bg-primary/10 focus:text-primary">Humain (Suggestion)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground px-1">Modèle Sélectionné</Label>
              <Select 
                value={formData.model} 
                onValueChange={(v) => {
                  const selectedModel = availableModels.find(m => m.id === v);
                  if (selectedModel) {
                    setFormData({
                      ...formData,
                      model: v,
                      endpoint: selectedModel.endpoint
                    });
                  }
                }}
              >
                <SelectTrigger className="h-14 border-2 border-slate-100 dark:border-primary/5 rounded-lg focus:ring-primary/20 font-bold text-[10px] uppercase tracking-widest bg-slate-50 dark:bg-background/50 shadow-inner transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl bg-white dark:bg-card/95 backdrop-blur-sm">
                  {availableModels.length > 0 ? (
                    availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="font-bold text-[10px] uppercase tracking-widest py-4 cursor-pointer transition-colors duration-200 focus:bg-primary/10 focus:text-primary">
                        {model.name} {model.is_default && "(Par défaut)"}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Aucun modèle disponible</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50/50 dark:bg-muted/5 border-t border-slate-100 dark:border-primary/5 flex flex-col sm:flex-row gap-4">
             <Button variant="outline" asChild className="w-full sm:flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-lg border-2 border-slate-200 dark:border-primary/20 hover:bg-primary/5 transition-all duration-200 shadow-sm">
                <Link href={`/ai/config?session=${formData.sessionId}`} className="flex items-center justify-center gap-3" prefetch={false}>
                  <Zap className="w-4 h-4 text-amber-500" />
                  Configuration Avancée
                </Link>
             </Button>
            <Button 
              onClick={handleSave} 
              className="w-full sm:flex-1 h-14 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all duration-200 active:scale-95 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
