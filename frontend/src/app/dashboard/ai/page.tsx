"use client"

import * as React from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { AITour } from "@/components/dashboard/ai-tour"
import { 
  Bot, 
  Settings2, 
  Trash2, 
  Activity,
  MessageSquare,
  Save,
  MoreVertical,
  Zap,
  Sparkles,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  ZapOff
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
  const [isToggling, setIsToggling] = React.useState<string | null>(null)
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

  // Global Stats calculation
  const globalStats = React.useMemo(() => {
    return items.reduce((acc, item) => ({
      totalSent: acc.totalSent + (item.aiConfig.stats?.sent || 0),
      activeBots: acc.activeBots + (item.aiConfig.enabled ? 1 : 0),
      totalConnected: acc.totalConnected + (item.isConnected ? 1 : 0)
    }), { totalSent: 0, activeBots: 0, totalConnected: 0 })
  }, [items])

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const userData = await api.auth.check(token || undefined)
      const email = user?.primaryEmailAddress?.emailAddress
      setIsAdmin(userData?.role === 'admin' || (email && email.toLowerCase() === 'maruise237@gmail.com'))

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
  }, [getToken, user])

  React.useEffect(() => {
    if (isLoaded && user) {
      fetchData()
      
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
    setIsToggling(item.sessionId)
    try {
      const token = await getToken()
      const newEnabled = !item.aiConfig.enabled
      await api.sessions.updateAI(item.sessionId, {
        ...item.aiConfig,
        enabled: newEnabled
      }, token || undefined)

      if (newEnabled) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ffffff']
        })
        toast.success("Assistant IA activé ! 🚀", {
          description: "Votre numéro est désormais sous pilotage intelligent."
        })
      } else {
        toast.success(`Assistant IA désactivé`)
      }
      await fetchData()
    } catch (error) {
      toast.error("Erreur lors de la modification")
    } finally {
      setIsToggling(null)
    }
  }

  return (
    <div className="space-y-10 pb-20">
      <AITour enabled={showTour} onExit={handleTourExit} />
      
      {/* 2025 Immersive Header */}
      <section className="relative p-8 sm:p-12 rounded-3xl overflow-hidden bg-slate-900 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-12">
          <div className="space-y-6 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest"
            >
              <Sparkles className="w-3 h-3" />
              Intelligence Center v5.0 — 2025 EDITION
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl font-black tracking-tighter leading-none"
            >
              VOTRE <span className="text-primary italic">BRAIN</span> <br />
              SUR WHATSAPP.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 text-sm sm:text-lg font-medium max-w-lg leading-relaxed"
            >
              Déployez une intelligence artificielle sur-mesure sur chacun de vos numéros.
              Support, vente ou engagement : automatisez avec précision.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              {isAdmin && (
                <Button asChild size="lg" className="rounded-xl font-black uppercase tracking-widest text-[11px] h-14 px-8 whappi-gradient border-none shadow-xl shadow-primary/20">
                  <Link href="/dashboard/ai-models">
                    <Brain className="w-5 h-5 mr-3" />
                    Neural Network Config
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowTour(true)}
                className="rounded-xl font-black uppercase tracking-widest text-[11px] h-14 px-8 border-slate-700 bg-transparent text-white hover:bg-white hover:text-slate-900 transition-all"
              >
                <HelpCircle className="w-5 h-5 mr-3" />
                Démarrer le guide
              </Button>
            </motion.div>
          </div>

          {/* Quick Global Stats Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-80"
          >
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between group hover:bg-white/10 transition-all cursor-default">
              <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit group-hover:scale-110 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tighter">{globalStats.totalSent}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rép. envoyées</div>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col justify-between group hover:bg-white/10 transition-all cursor-default">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit group-hover:scale-110 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tighter">{globalStats.activeBots}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bots actifs</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions / Checklist for New Users */}
      {items.length > 0 && globalStats.activeBots === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-amber-500/5"
        >
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-xl bg-amber-500 text-white shadow-lg">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-tighter text-amber-600 leading-none mb-1">Prêt pour le déploiement ?</p>
              <p className="text-xs font-medium text-amber-700/60 uppercase tracking-widest">Activez votre premier assistant pour commencer à automatiser.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-xl border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest h-12 px-8">
            <Link href={`/dashboard/ai/config?session=${items[0].sessionId}`}>Configurer maintenant</Link>
          </Button>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">Sessions connectées</h2>
          <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full border-primary/20 text-primary bg-primary/5">
            {items.length} Instances
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-10">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="h-96 animate-pulse rounded-3xl border-dashed border-2 border-slate-200 dark:border-primary/10" />
              ))
            ) : items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full"
              >
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white dark:bg-card/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-primary/10 space-y-8">
                  <div className="p-10 bg-slate-50 dark:bg-primary/5 rounded-full relative">
                    <Bot className="w-20 h-20 text-muted-foreground opacity-20" />
                    <ZapOff className="w-8 h-8 text-red-500 absolute top-0 right-0 animate-pulse" />
                  </div>
                  <div className="space-y-3 max-w-sm px-4">
                    <p className="text-xl font-black uppercase tracking-tighter">Aucune instance active</p>
                    <p className="text-sm text-muted-foreground font-medium">
                      Connectez votre premier compte WhatsApp pour débloquer la puissance de l'IA.
                    </p>
                  </div>
                  <Button asChild className="rounded-xl font-black uppercase tracking-widest text-[11px] h-14 px-10 whappi-gradient border-none shadow-2xl shadow-primary/30">
                    <Link href="/dashboard/connections">Connecter WhatsApp</Link>
                  </Button>
                </div>
              </motion.div>
            ) : (
              items.map((item, index) => (
                <motion.div
                  key={item.sessionId}
                  layout
                  whileHover={{ y: -5 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={cn(
                    "group relative overflow-hidden rounded-3xl border-2 transition-all duration-500 h-full flex flex-col",
                    item.aiConfig.enabled
                      ? "border-primary/10 bg-white dark:bg-card shadow-[0_20px_50px_-20px_rgba(var(--primary-rgb),0.1)] hover:shadow-[0_40px_80px_-20px_rgba(var(--primary-rgb),0.2)]"
                      : "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2"
                  )}>
                    {/* Status Orb */}
                    <div className={cn(
                      "absolute top-6 right-6 w-2.5 h-2.5 rounded-full animate-pulse",
                      item.aiConfig.enabled ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-white/20"
                    )} />

                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-xl",
                          item.aiConfig.enabled
                            ? "bg-primary text-white shadow-primary/20"
                            : "bg-slate-200 dark:bg-white/10 text-slate-400"
                        )}>
                          <Bot className="w-8 h-8" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <CardTitle className="text-2xl font-black tracking-tighter uppercase truncate leading-none">
                            {item.sessionId}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary px-3">
                              {item.aiConfig.mode}
                            </Badge>
                            {!item.isConnected && (
                              <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-widest px-3">Offline</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-8 pt-4 space-y-8 flex-1">
                      {/* Intelligence Preview */}
                      <div className="relative">
                        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-primary/5 border border-slate-100 dark:border-primary/10 min-h-[7rem] shadow-inner group-hover:bg-primary/[0.08] transition-colors">
                          <p className="text-[11px] font-medium text-muted-foreground leading-relaxed line-clamp-3 italic">
                            {item.aiConfig.prompt ? (
                              `"${item.aiConfig.prompt}"`
                            ) : (
                              <span className="opacity-30 uppercase tracking-[0.2em] font-black text-[9px]">En attente d'instructions...</span>
                            )}
                          </p>
                        </div>
                        <div className="absolute -top-3 -right-3">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-primary/20 shadow-lg">
                            <Brain className="w-4 h-4 text-primary" />
                          </div>
                        </div>
                      </div>

                      {/* Mini Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-transparent group-hover:border-slate-100 dark:group-hover:border-white/10 transition-all">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Rép.</div>
                          <div className="text-xl font-black tracking-tighter">{item.aiConfig.stats?.sent || 0}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-transparent group-hover:border-slate-100 dark:group-hover:border-white/10 transition-all">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Moteur</div>
                          <div className="text-[11px] font-black truncate uppercase tracking-tight text-primary">
                            {item.aiConfig.model?.split('-')[0] || 'Generic'}
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-8 pt-0 flex items-center justify-between gap-4 mt-auto">
                      <div className="flex-1 flex items-center justify-between p-2 pl-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</span>
                        {isToggling === item.sessionId ? (
                          <div className="w-8 h-4 animate-pulse bg-primary/20 rounded-full" />
                        ) : (
                          <Switch
                            checked={item.aiConfig.enabled}
                            onCheckedChange={() => toggleAI(item)}
                            className="data-[state=checked]:bg-primary shadow-lg"
                          />
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:bg-primary/10 hover:text-primary transition-all">
                            <MoreVertical className="w-6 h-6" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72 p-3 rounded-2xl border-2 border-slate-100 dark:border-white/5 shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-card/95">
                          <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-60">Neural Controls</DropdownMenuLabel>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem onClick={() => handleOpenQuickEdit(item)} className="cursor-pointer rounded-xl p-4 focus:bg-primary/10 focus:text-primary group/item mb-1">
                            <Settings2 className="w-5 h-5 mr-4 text-primary transition-transform group-hover/item:rotate-90" />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-black uppercase tracking-widest text-[11px]">Quick Tuning</span>
                              <span className="text-[8px] font-bold opacity-40 uppercase tracking-tight">Modèle et mode de réponse</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-4 focus:bg-amber-500/10 focus:text-amber-500 group/item">
                             <Link href={`/dashboard/ai/config?session=${item.sessionId}`} className="flex items-center w-full" prefetch={false}>
                              <Zap className="w-5 h-5 mr-4 text-amber-500 group-hover/item:scale-110 transition-transform" />
                              <div className="flex flex-col gap-0.5">
                                <span className="font-black uppercase tracking-widest text-[11px]">Advanced Matrix</span>
                                <span className="text-[8px] font-bold opacity-40 uppercase tracking-tight">Paramètres profonds et sécurité</span>
                              </div>
                             </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-xl p-4">
                            <Trash2 className="w-5 h-5 mr-4" />
                            <span className="font-black uppercase tracking-widest text-[11px]">Format instance</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>

                    {/* Action Button Overlay on Hover */}
                    <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
                      <Button asChild variant="secondary" className="rounded-full font-black uppercase tracking-widest text-[10px] px-8 h-12 shadow-2xl pointer-events-auto hover:scale-110 transition-transform">
                        <Link href={`/dashboard/ai/config?session=${item.sessionId}`}>
                          Open Settings <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RE-IMAGINED QUICK EDIT DIALOG */}
      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none rounded-3xl bg-white dark:bg-card shadow-2xl">
          <div className="p-8 sm:p-12 space-y-10">
            <DialogHeader className="text-left space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary w-fit shadow-inner">
                <Settings2 className="w-8 h-8" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tighter uppercase leading-none">Quick Tuning</DialogTitle>
                <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 opacity-60">
                  Instance: {formData.sessionId}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="space-y-8">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                <Label htmlFor="quick-enable" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-black uppercase tracking-widest text-xs">Activation</span>
                  <span className="font-bold text-[9px] uppercase tracking-tight text-muted-foreground opacity-60">Status neural network</span>
                </Label>
                <Switch
                  id="quick-enable"
                  checked={formData.enabled}
                  onCheckedChange={(c) => setFormData({...formData, enabled: c})}
                  className="data-[state=checked]:bg-primary scale-125"
                />
              </div>

              <div className="space-y-4">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground px-2">Operational Mode</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(v) => setFormData({...formData, mode: v})}
                >
                  <SelectTrigger className="h-16 rounded-2xl border-2 border-slate-100 dark:border-white/5 focus:ring-primary/20 font-black text-[11px] uppercase tracking-widest bg-slate-50 dark:bg-white/2 shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 border-slate-100 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900">
                    <SelectItem value="bot" className="font-black text-[10px] uppercase tracking-widest p-4 focus:bg-primary/10 focus:text-primary">Fully Autonomous</SelectItem>
                    <SelectItem value="hybrid" className="font-black text-[10px] uppercase tracking-widest p-4 focus:bg-primary/10 focus:text-primary">Hybrid Guard</SelectItem>
                    <SelectItem value="human" className="font-black text-[10px] uppercase tracking-widest p-4 focus:bg-primary/10 focus:text-primary">Human-in-the-loop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground px-2">Core Engine</Label>
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
                  <SelectTrigger className="h-16 rounded-2xl border-2 border-slate-100 dark:border-white/5 focus:ring-primary/20 font-black text-[11px] uppercase tracking-widest bg-slate-50 dark:bg-white/2 shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 border-slate-100 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900">
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="font-black text-[10px] uppercase tracking-widest p-4 focus:bg-primary/10 focus:text-primary">
                        {model.name} {model.is_default && "⚡"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="outline" asChild className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-slate-100 dark:border-white/5">
                <Link href={`/dashboard/ai/config?session=${formData.sessionId}`} className="flex items-center justify-center gap-3">
                  Advanced Matrix <Zap className="w-4 h-4 text-amber-500" />
                </Link>
              </Button>
              <Button
                onClick={handleSave}
                className="w-full sm:flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] whappi-gradient border-none shadow-xl shadow-primary/20"
              >
                <Save className="w-4 h-4 mr-3" /> Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
