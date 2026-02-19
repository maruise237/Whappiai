"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AITour } from "@/components/dashboard/ai-tour"
import { 
  ArrowLeft, 
  Save, 
  Bot, 
  Cpu, 
  Sparkles, 
  ShieldAlert,
  KeyRound,
  Network,
  Zap,
  HelpCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function AIConfigForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()

  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [availableModels, setAvailableModels] = React.useState<any[]>([])
  const [templates, setTemplates] = React.useState<any>({})
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [showTour, setShowTour] = React.useState(false)

  const [formData, setFormData] = React.useState({
    enabled: false,
    mode: "bot",
    model: "deepseek-chat",
    endpoint: "",
    key: "",
    prompt: "",
    deactivate_on_typing: false,
    deactivate_on_read: false,
    trigger_keywords: "",
    reply_delay: 0,
      read_on_reply: false,
      reject_calls: false,
      random_protection_enabled: true,
      random_protection_rate: 0.1
    })

  React.useEffect(() => {
    const loadData = async () => {
      if (!sessionId) {
        setIsLoading(false)
        return
      }
      try {
        const token = await getToken()
        // Check if admin
        const user = await api.auth.check(token || undefined)
        const isUserAdmin = user?.role === 'admin' || clerkUser?.primaryEmailAddress?.emailAddress === 'maruise237@gmail.com'
        setIsAdmin(isUserAdmin)

        // Get global models
        const models = await api.ai.listModels(token || undefined)
        setAvailableModels(models || [])
        const defaultModel = models?.find((m: any) => m.is_default) || models?.[0]

        // Get AI templates
        try {
          const templatesData = await api.ai.getTemplates(token || undefined)
          setTemplates(templatesData || {})
        } catch (e) {
          console.error("Failed to load templates", e)
        }

        const config = await api.sessions.getAI(sessionId, token || undefined)
        setFormData({
          enabled: config.enabled ?? false,
          mode: config.mode || "bot",
          model: config.model || defaultModel?.id || "deepseek-chat",
          endpoint: config.endpoint || defaultModel?.endpoint || "",
          key: config.key || "",
          prompt: config.prompt || "Tu es un assistant utile.",
          deactivate_on_typing: config.deactivate_on_typing ?? false,
          deactivate_on_read: config.deactivate_on_read ?? false,
          trigger_keywords: config.trigger_keywords || "",
          reply_delay: config.reply_delay || 0,
          read_on_reply: config.read_on_reply ?? false,
          reject_calls: config.reject_calls ?? false,
          random_protection_enabled: config.random_protection_enabled ?? true,
          random_protection_rate: config.random_protection_rate ?? 0.1
        })

        // Auto-start tour if first time on this config page
        const hasSeenAIConfigTour = localStorage.getItem("hasSeenAIConfigTour")
        if (!hasSeenAIConfigTour) {
          setTimeout(() => setShowTour(true), 1000)
        }
      } catch (error) {
        toast.error("Impossible de charger la configuration")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [sessionId, getToken, clerkUser])

  const handleTourExit = () => {
    setShowTour(false)
    localStorage.setItem("hasSeenAIConfigTour", "true")
  }

  const handleSave = async () => {
    if (!sessionId) return
    
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateAI(sessionId, formData, token || undefined)
      toast.success("Configuration avancée enregistrée")
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-black uppercase tracking-tighter">Session non spécifiée</h2>
        <Button variant="link" onClick={() => router.push('/dashboard/ai')} className="text-primary font-bold uppercase tracking-widest text-xs">Retour à la liste</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <AITour enabled={showTour} onExit={handleTourExit} isConfigPage={true} />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8 bg-white/80 dark:bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl relative overflow-hidden group ai-config-header">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="flex items-center gap-4 sm:gap-6 relative z-10 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/dashboard/ai')} 
            className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg border-2 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7" />
          </Button>
          <div className="space-y-1 sm:space-y-1.5 flex-1">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-xl sm:text-3xl font-black tracking-tighter uppercase leading-none">
                Config <span className="text-primary">IA</span>
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTour(true)}
                className="rounded-full h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Démarrer le tour guidé"
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-background/50 border-primary/10 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-primary shadow-sm truncate max-w-[150px] sm:max-w-none">
                {sessionId}
              </Badge>
              <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary/30" />
              <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Paramètres</span>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full md:w-auto shadow-xl shadow-primary/20 h-12 sm:h-16 px-6 sm:px-10 font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] rounded-lg transition-all duration-200 gap-2 sm:gap-3 bg-primary hover:bg-primary/90 text-white relative z-10 ai-save-button"
        >
          {isSaving ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span>Enregistrer</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-12">
          <Accordion type="multiple" defaultValue={["status", "prompt"]} className="space-y-6">
            {/* Status & Mode */}
            <AccordionItem value="status" className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl px-0">
              <AccordionTrigger className="p-4 sm:p-8 hover:no-underline">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <div className="text-left">
                    <div className="text-sm sm:text-base font-black uppercase tracking-widest">Statut & Mode</div>
                    <div className="font-bold text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Définissez l'interaction</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 sm:p-8 pt-0 space-y-6 sm:space-y-10 ai-model-selector border-t border-slate-100 dark:border-primary/5">
                <div className="flex items-center justify-between p-4 sm:p-6 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 group shadow-inner duration-200">
                  <div className="space-y-0.5 sm:space-y-1">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Activer l'Assistant</Label>
                    <p className="text-[7px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Réponses automatiques</p>
                  </div>
                  <Switch 
                    checked={formData.enabled}
                    onCheckedChange={(c) => setFormData({...formData, enabled: c})}
                    className="data-[state=checked]:bg-primary shadow-sm scale-110 sm:scale-125"
                  />
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                    <Cpu className="w-3 h-3 sm:w-4 sm:h-4" /> Mode de Fonctionnement
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 ai-mode-selector">
                    {[
                      { id: 'bot', name: 'Robot', icon: Bot, desc: '100% Auto', color: 'bg-primary' },
                      { id: 'hybrid', name: 'Hybride', icon: Cpu, desc: 'Délai 5s', color: 'bg-amber-500' },
                      { id: 'human', name: 'Humain', icon: Sparkles, desc: 'Suggestions', color: 'bg-emerald-500' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setFormData({...formData, mode: m.id})}
                        className={cn(
                          "flex flex-row sm:flex-col items-center gap-4 sm:gap-5 p-4 sm:p-6 rounded-lg border-2 transition-all duration-300 text-left sm:text-center group relative overflow-hidden",
                          formData.mode === m.id 
                            ? "border-primary bg-primary/5 shadow-inner" 
                            : "border-transparent bg-slate-50/50 dark:bg-muted/20 hover:bg-slate-100 dark:hover:bg-muted/40"
                        )}
                      >
                        <div className={cn(
                          "p-3 sm:p-4 rounded-lg transition-all duration-300 group-hover:scale-110 shadow-sm",
                          formData.mode === m.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-200/50 text-slate-400 dark:bg-muted dark:text-muted-foreground/40"
                        )}>
                          <m.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                          <div className="text-[9px] sm:text-[11px] font-black tracking-tight group-hover:text-primary transition-colors uppercase">{m.name}</div>
                          <div className="text-[7px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 leading-none">{m.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Automatic Controls */}
            <AccordionItem value="controls" className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl px-0">
              <AccordionTrigger className="p-4 sm:p-8 hover:no-underline">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <div className="text-left">
                    <div className="text-sm sm:text-base font-black uppercase tracking-widest">Contrôle Automatique</div>
                    <div className="font-bold text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Gérez l'activation intelligente</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 sm:p-8 pt-0 space-y-6 sm:space-y-10 border-t border-slate-100 dark:border-primary/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 pt-4 sm:pt-6">
                  <div className="flex items-center justify-between p-4 sm:p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border border-slate-100 dark:border-primary/5 transition-all hover:bg-slate-100 dark:hover:bg-muted/40 group shadow-sm duration-200">
                    <div className="space-y-0.5 sm:space-y-1">
                      <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Stop si j'écris</Label>
                      <p className="text-[7px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Désactive l'IA au tapage</p>
                    </div>
                    <Switch 
                      checked={formData.deactivate_on_typing}
                      onCheckedChange={(c) => setFormData({...formData, deactivate_on_typing: c})}
                      className="data-[state=checked]:bg-primary shadow-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 sm:p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border border-slate-100 dark:border-primary/5 transition-all hover:bg-slate-100 dark:hover:bg-muted/40 group shadow-sm duration-200">
                    <div className="space-y-0.5 sm:space-y-1">
                      <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Stop si j'ai lu</Label>
                      <p className="text-[7px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Désactive l'IA à la lecture</p>
                    </div>
                    <Switch 
                      checked={formData.deactivate_on_read}
                      onCheckedChange={(c) => setFormData({...formData, deactivate_on_read: c})}
                      className="data-[state=checked]:bg-primary shadow-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 sm:p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border border-slate-100 dark:border-primary/5 transition-all hover:bg-slate-100 dark:hover:bg-muted/40 group shadow-sm duration-200">
                    <div className="space-y-0.5 sm:space-y-1">
                      <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Lu avant réponse</Label>
                      <p className="text-[7px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Marque comme vu</p>
                    </div>
                    <Switch 
                      checked={formData.read_on_reply}
                      onCheckedChange={(c) => setFormData({...formData, read_on_reply: c})}
                      className="data-[state=checked]:bg-primary shadow-sm"
                    />
                  </div>

                  <div className={cn(
                    "flex items-center justify-between p-4 sm:p-6 rounded-lg border transition-all group shadow-sm duration-200",
                    formData.reject_calls 
                      ? "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-950/40" 
                      : "bg-slate-50/50 dark:bg-muted/20 border-slate-100 dark:border-primary/5 hover:bg-slate-100 dark:hover:bg-muted/40"
                  )}>
                    <div className="space-y-0.5 sm:space-y-1">
                      <Label className={cn(
                        "text-[9px] sm:text-[11px] font-black uppercase tracking-widest transition-colors",
                        formData.reject_calls ? "text-red-600 dark:text-red-400" : "text-foreground group-hover:text-primary"
                      )}>Rejet d'appels</Label>
                      <p className="text-[7px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Rejeter les appels entrants</p>
                    </div>
                    <Switch 
                      checked={formData.reject_calls}
                      onCheckedChange={(c) => setFormData({...formData, reject_calls: c})}
                      className="data-[state=checked]:bg-red-600 shadow-sm"
                    />
                  </div>

                  <div className={cn(
                    "flex items-center justify-between p-4 sm:p-6 rounded-lg border transition-all group shadow-sm duration-200 col-span-1 md:col-span-2",
                    formData.random_protection_enabled 
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                      : "bg-slate-50/50 dark:bg-muted/20 border-slate-100 dark:border-primary/5 hover:bg-slate-100 dark:hover:bg-muted/40"
                  )}>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5 sm:space-y-1">
                          <Label className={cn(
                            "text-[9px] sm:text-[11px] font-black uppercase tracking-widest transition-colors",
                            formData.random_protection_enabled ? "text-primary" : "text-foreground group-hover:text-primary"
                          )}>Protection Aléatoire (IA)</Label>
                          <p className="text-[7px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Bloque aléatoirement des messages pour éviter les boucles et simuler un humain</p>
                        </div>
                        <Switch 
                          checked={formData.random_protection_enabled}
                          onCheckedChange={(c) => setFormData({...formData, random_protection_enabled: c})}
                          className="data-[state=checked]:bg-primary shadow-sm"
                        />
                      </div>
                      
                      {formData.random_protection_enabled && (
                        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center justify-between">
                            <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-60">
                              Taux de protection : {Math.round(formData.random_protection_rate * 100)}%
                            </Label>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-muted-foreground">0%</span>
                            <input 
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={formData.random_protection_rate}
                              onChange={(e) => setFormData({...formData, random_protection_rate: parseFloat(e.target.value)})}
                              className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground">100%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-slate-100 dark:border-primary/5">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" /> Délai (s)
                      </Label>
                      <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary">
                        {formData.reply_delay}s
                      </Badge>
                    </div>
                    <Input 
                      type="number"
                      min="0"
                      max="60"
                      value={formData.reply_delay}
                      onChange={(e) => setFormData({...formData, reply_delay: parseInt(e.target.value) || 0})}
                      placeholder="Délai"
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-10 sm:h-14 rounded-lg font-medium text-[11px] sm:text-xs shadow-inner transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                        <Bot className="w-3 h-3 sm:w-4 sm:h-4" /> Mots-clés
                      </Label>
                      <Badge variant="outline" className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary">Optionnel</Badge>
                    </div>
                    <Input 
                      value={formData.trigger_keywords}
                      onChange={(e) => setFormData({...formData, trigger_keywords: e.target.value})}
                      placeholder="ia, help..."
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-10 sm:h-14 rounded-lg font-medium text-[11px] sm:text-xs shadow-inner transition-all duration-300"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Prompt Config */}
            <AccordionItem value="prompt" className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl px-0">
              <AccordionTrigger className="p-4 sm:p-8 hover:no-underline">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <div className="text-left">
                    <div className="text-sm sm:text-base font-black uppercase tracking-widest">Instructions (Prompt)</div>
                    <div className="font-bold text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Personnalisez la personnalité</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 sm:p-8 pt-0 space-y-6 sm:space-y-8 ai-prompt-area border-t border-slate-100 dark:border-primary/5">
                <div className="pt-4 sm:pt-6 space-y-6 sm:space-y-8">
                  {/* Templates Selector */}
                  {Object.keys(templates).length > 0 && (
                    <div className="space-y-3 sm:space-y-4">
                      <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> Modèles Rapides
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                        {Object.values(templates).map((template: any) => (
                          <button
                            key={template.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, prompt: template.prompt });
                              toast.success(`Modèle "${template.name}" appliqué`);
                            }}
                            className="flex flex-col items-start text-left p-3 sm:p-4 rounded-lg border-2 border-slate-100 dark:border-primary/5 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group relative overflow-hidden"
                          >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight mb-0.5 sm:mb-1 group-hover:text-primary transition-colors">{template.name}</span>
                            <span className="text-[8px] sm:text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60 leading-tight line-clamp-1">{template.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                      <Cpu className="w-3 h-3 sm:w-4 sm:h-4" /> Éditeur de Prompt
                    </Label>
                    <Textarea 
                      value={formData.prompt}
                      onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                      placeholder="Ex: Tu es un assistant commercial expert..."
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 resize-none font-medium text-[11px] sm:text-sm rounded-lg min-h-[200px] sm:min-h-[300px] p-4 sm:p-8 leading-relaxed shadow-inner transition-all duration-300"
                    />
                  </div>

                  <div className="flex items-center gap-3 sm:gap-5 p-4 sm:p-6 bg-primary/5 rounded-lg border border-primary/10 shadow-sm group hover:bg-primary/10 transition-colors duration-200">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shadow-inner group-hover:scale-110 transition-transform duration-200">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed opacity-70">
                      Définissez rôle, ton et limites.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* API Config */}
            <AccordionItem value="engine" className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl px-0">
              <AccordionTrigger className="p-4 sm:p-8 hover:no-underline">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Network className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <div className="text-left">
                    <div className="text-sm sm:text-base font-black uppercase tracking-widest">Moteur IA</div>
                    <div className="font-bold text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Sélectionnez le modèle</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 sm:p-8 pt-0 space-y-6 sm:space-y-10 ai-model-selector border-t border-slate-100 dark:border-primary/5">
                <div className="pt-4 sm:pt-6 space-y-6 sm:space-y-10">
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                      <Cpu className="w-3 h-3 sm:w-4 sm:h-4" /> Modèle Sélectionné
                    </Label>
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
                      <SelectTrigger className="h-10 sm:h-14 border-2 border-slate-100 dark:border-primary/5 rounded-lg focus:ring-primary/20 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest bg-slate-50/50 dark:bg-muted/20 shadow-inner transition-all duration-300">
                        <SelectValue placeholder="Choisir un modèle" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl bg-white/95 dark:bg-card/95 backdrop-blur-xl p-2">
                        {availableModels.length > 0 ? (
                          availableModels.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="font-bold text-[9px] sm:text-[10px] uppercase tracking-widest py-3 sm:py-4 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors rounded-lg mb-1">
                              {model.name} {model.is_default && <Badge className="ml-2 bg-primary/20 text-primary border-none text-[7px] sm:text-[8px]">Défaut</Badge>}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Aucun modèle</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {isAdmin && (
                    <div className="space-y-6 sm:space-y-10 pt-6 sm:pt-10 border-t border-slate-100 dark:border-primary/5">
                      <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
                        <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-500">Admin</span>
                      </div>
                      
                      <div className="space-y-3 sm:space-y-4">
                        <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                          <Network className="w-3 h-3 sm:w-4 sm:h-4" /> Endpoint
                        </Label>
                        <Input 
                          value={formData.endpoint}
                          onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                          placeholder="https://..."
                          className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-10 sm:h-16 rounded-lg font-mono text-[10px] sm:text-[11px] shadow-inner transition-all duration-300"
                        />
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <Label className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2 sm:gap-3 opacity-60 ml-1 sm:ml-2">
                          <KeyRound className="w-3 h-3 sm:w-4 sm:h-4" /> Clé API
                        </Label>
                        <div className="relative group">
                          <Input 
                            type="password"
                            value={formData.key}
                            onChange={(e) => setFormData({...formData, key: e.target.value})}
                            placeholder="sk-..."
                            className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-10 sm:h-16 rounded-lg pr-12 sm:pr-16 font-mono text-[10px] sm:text-[11px] shadow-inner transition-all duration-300"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-6 text-slate-300 group-focus-within:text-primary transition-colors duration-200">
                            <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isAdmin && (
                    <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-muted/10 rounded-lg border border-slate-100 dark:border-primary/5 shadow-inner">
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldAlert className="w-4 h-4 text-slate-400" />
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">Sécurité</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium leading-relaxed">
                        Géré par l'administrateur.
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}

export default function AIConfigPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <AIConfigForm />
    </React.Suspense>
  )
}
