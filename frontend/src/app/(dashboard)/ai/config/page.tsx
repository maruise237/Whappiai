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
  HelpCircle,
  MessageSquareOff,
  UserCheck,
  Filter,
  Clock,
  Keyboard,
  Settings2,
  Key,
  Globe,
  Timer
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
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [showTour, setShowTour] = React.useState(false)

  const [formData, setFormData] = React.useState({
    enabled: false,
    mode: "bot",
    model: "deepseek-chat",
    endpoint: "",
    key: "",
    prompt: "",
    ignore_if_user_typing: true,
    ignore_if_user_replied: true,
    keywords_trigger: "",
    keywords_ignore: "",
    schedule_enabled: false,
    schedule_config: "{}",
    typing_delay_min: 2000,
    typing_delay_max: 5000
  })

  // Simple Schedule Helper
  const parseSchedule = (configStr: string) => {
    try {
      return JSON.parse(configStr || "{}")
    } catch {
      return {}
    }
  }

  const updateSchedule = (day: string, field: string, value: any) => {
    const current = parseSchedule(formData.schedule_config)
    const dayConfig = current[day] || { enabled: false, start: "09:00", end: "18:00" }
    
    const updated = {
      ...current,
      [day]: {
        ...dayConfig,
        [field]: value
      }
    }
    setFormData({ ...formData, schedule_config: JSON.stringify(updated) })
  }

  const days = [
    { id: 'monday', label: 'Lundi' },
    { id: 'tuesday', label: 'Mardi' },
    { id: 'wednesday', label: 'Mercredi' },
    { id: 'thursday', label: 'Jeudi' },
    { id: 'friday', label: 'Vendredi' },
    { id: 'saturday', label: 'Samedi' },
    { id: 'sunday', label: 'Dimanche' }
  ]

  React.useEffect(() => {
    const loadData = async () => {
      if (!sessionId) {
        setIsLoading(false)
        return
      }
      try {
        const token = await getToken()
        const user = await api.auth.check(token || undefined)
        const isUserAdmin = user?.role === 'admin' || clerkUser?.primaryEmailAddress?.emailAddress === 'maruise237@gmail.com'
        setIsAdmin(isUserAdmin)

        const models = await api.ai.listModels(token || undefined)
        setAvailableModels(models || [])
        const defaultModel = models?.find((m: any) => m.is_default) || models?.[0]

        const config = await api.sessions.getAI(sessionId, token || undefined)
        setFormData({
          enabled: config.enabled ?? false,
          mode: config.mode || "bot",
          model: config.model || defaultModel?.id || "deepseek-chat",
          endpoint: config.endpoint || defaultModel?.endpoint || "",
          key: config.key || "",
          prompt: config.prompt || "Tu es un assistant utile.",
          ignore_if_user_typing: config.ignore_if_user_typing ?? true,
          ignore_if_user_replied: config.ignore_if_user_replied ?? true,
          keywords_trigger: config.keywords_trigger || "",
          keywords_ignore: config.keywords_ignore || "",
          schedule_enabled: config.schedule_enabled ?? false,
          schedule_config: config.schedule_config || "{}",
          typing_delay_min: config.typing_delay_min || 2000,
          typing_delay_max: config.typing_delay_max || 5000
        })
      } catch (error) {
        toast.error("Impossible de charger la configuration")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [sessionId, getToken, clerkUser])

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
        <Button variant="link" onClick={() => router.push('/ai')} className="text-primary font-bold uppercase tracking-widest text-xs">Retour à la liste</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pt-10 pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      {showTour && <AITour enabled={showTour} onExit={() => setShowTour(false)} isConfigPage={true} />}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-white/80 dark:bg-card/80 backdrop-blur-xl p-8 rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl relative overflow-hidden group ai-config-header">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="flex items-center gap-6 relative z-10">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push('/ai')} 
            className="h-14 w-14 rounded-lg border-2 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="w-7 h-7" />
          </Button>
          <div className="space-y-1.5">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
                Configuration <span className="text-primary">IA Avancée</span>
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTour(true)}
                className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Démarrer le tour guidé"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-background/50 border-primary/10 px-3 py-1 rounded-lg text-primary shadow-sm">
                SESSION: {sessionId}
              </Badge>
              <div className="h-1.5 w-1.5 rounded-full bg-primary/30" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Paramètres Personnalisés</span>
            </div>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full md:w-auto shadow-xl shadow-primary/20 h-16 px-10 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg transition-all duration-200 gap-3 bg-primary hover:bg-primary/90 text-white relative z-10 ai-save-button"
        >
          {isSaving ? (
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Enregistrer les changements
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-10">
          {/* Status & Mode */}
          <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
              <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                <Sparkles className="w-6 h-6 text-primary" />
                Statut & Mode de Réponse
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Définissez comment l'IA interagit avec vos clients</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10 ai-model-selector">
              <div className="flex items-center justify-between p-6 rounded-lg bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 group shadow-inner duration-200">
                <div className="space-y-1">
                  <Label className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Activer l'Assistant</Label>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Activer les réponses automatiques pour ce numéro</p>
                </div>
                <Switch 
                  checked={formData.enabled}
                  onCheckedChange={(c) => setFormData({...formData, enabled: c})}
                  className="data-[state=checked]:bg-primary shadow-sm scale-125"
                />
              </div>

              <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-3 opacity-60 ml-2">
                  <Cpu className="w-4 h-4" /> Mode de Fonctionnement
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 ai-mode-selector">
                  {[
                    { id: 'bot', name: 'Robot', icon: Bot, desc: '100% Auto', color: 'bg-primary' },
                    { id: 'hybrid', name: 'Hybride', icon: Cpu, desc: 'Délai 5s', color: 'bg-amber-500' },
                    { id: 'human', name: 'Humain', icon: Sparkles, desc: 'Suggestions', color: 'bg-emerald-500' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setFormData({...formData, mode: m.id})}
                      className={cn(
                        "flex flex-col items-center gap-5 p-6 rounded-lg border-2 transition-all duration-300 text-center group relative overflow-hidden",
                        formData.mode === m.id 
                          ? "border-primary bg-primary/5 shadow-inner" 
                          : "border-transparent bg-slate-50/50 dark:bg-muted/20 hover:bg-slate-100 dark:hover:bg-muted/40"
                      )}
                    >
                      <div className={cn(
                        "p-4 rounded-lg transition-all duration-300 group-hover:scale-110 shadow-sm",
                        formData.mode === m.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-200/50 text-slate-400 dark:bg-muted dark:text-muted-foreground/40"
                      )}>
                        <m.icon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-black tracking-tight group-hover:text-primary transition-colors uppercase">{m.name}</div>
                        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 leading-none">{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Config */}
          <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
              <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                <Bot className="w-6 h-6 text-primary" />
                Instructions Système (Prompt)
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Personnalisez la personnalité de votre bot</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6 ai-prompt-area">
              <Textarea 
                value={formData.prompt}
                onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                placeholder="Ex: Tu es un assistant commercial expert. Sois chaleureux, réponds toujours en français..."
                className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 resize-none font-medium text-sm rounded-lg min-h-[350px] p-8 leading-relaxed shadow-inner transition-all duration-300"
              />
              <div className="flex items-center gap-5 p-6 bg-primary/5 rounded-lg border border-primary/10 shadow-sm group hover:bg-primary/10 transition-colors duration-200">
                <div className="p-3 bg-primary/10 rounded-lg shadow-inner group-hover:scale-110 transition-transform duration-200">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed opacity-70">
                  Un bon prompt définit le rôle (Qui suis-je ?), le ton (Comment je parle ?), et les limites (Qu'est-ce que je ne fais pas ?).
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Auto-Deactivation Rules */}
          <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
              <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                <ShieldAlert className="w-6 h-6 text-primary" />
                Règles de Désactivation
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Quand l'IA doit-elle s'arrêter ?</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 group hover:border-primary/20 transition-all duration-200">
                <div className="space-y-1">
                  <Label className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">Si je suis en train d'écrire</Label>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Désactive l'IA si vous tapez un message</p>
                </div>
                <Switch 
                  checked={formData.ignore_if_user_typing}
                  onCheckedChange={(c) => setFormData({...formData, ignore_if_user_typing: c})}
                />
              </div>

              <div className="flex items-center justify-between p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 group hover:border-primary/20 transition-all duration-200">
                <div className="space-y-1">
                  <Label className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">Si j'ai déjà répondu</Label>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Désactive l'IA si votre message est le dernier</p>
                </div>
                <Switch 
                  checked={formData.ignore_if_user_replied}
                  onCheckedChange={(c) => setFormData({...formData, ignore_if_user_replied: c})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-10">
          {/* Model & API (Admins Only) */}
          {isAdmin && (
            <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
              <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
                <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                  <Settings2 className="w-6 h-6 text-primary" />
                  Modèle & API
                </CardTitle>
                <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Configuration technique du cerveau IA (Admin)</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60">Modèle d'IA</Label>
                  <div className="grid grid-cols-2 gap-4 ai-model-selector">
                    {[
                      { id: 'deepseek-chat', name: 'DeepSeek', desc: 'Rapide & Pro' },
                      { id: 'gpt-4o', name: 'GPT-4o', desc: 'Le plus intelligent' },
                      { id: 'gpt-3.5-turbo', name: 'GPT-3.5', desc: 'Économique' },
                      { id: 'custom', name: 'Custom', desc: 'Autre API' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setFormData({...formData, model: m.id})}
                        className={cn(
                          "p-5 rounded-lg border-2 transition-all duration-300 text-left group",
                          formData.model === m.id 
                            ? "border-primary bg-primary/5" 
                            : "border-transparent bg-slate-50/50 dark:bg-muted/20 hover:bg-slate-100 dark:hover:bg-muted/40"
                        )}
                      >
                        <div className="text-[11px] font-black uppercase tracking-tight group-hover:text-primary transition-colors">{m.name}</div>
                        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60 mt-1">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-primary/5">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60">Clé API</Label>
                    <div className="relative group ai-api-key">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <Input 
                        type="password"
                        value={formData.key}
                        onChange={(e) => setFormData({...formData, key: e.target.value})}
                        placeholder="sk-..."
                        className="pl-12 bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60">Endpoint (Optionnel)</Label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <Input 
                        value={formData.endpoint}
                        onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                        placeholder="https://api.openai.com/v1"
                        className="pl-12 bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Typing Simulation */}
          <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
              <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                <Timer className="w-6 h-6 text-primary" />
                Simulation d'Écriture
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Rendez l'IA plus humaine avec des délais</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8 ai-typing-delays">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60">Délai Min (ms)</Label>
                  <Input 
                    type="number"
                    value={formData.typing_delay_min}
                    onChange={(e) => setFormData({...formData, typing_delay_min: parseInt(e.target.value)})}
                    className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60">Délai Max (ms)</Label>
                  <Input 
                    type="number"
                    value={formData.typing_delay_max}
                    onChange={(e) => setFormData({...formData, typing_delay_max: parseInt(e.target.value)})}
                    className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg font-bold"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed opacity-60 bg-slate-100/50 dark:bg-muted/50 p-4 rounded-lg border border-slate-200 dark:border-primary/5">
                L'IA affichera "En train d'écrire..." pendant un temps aléatoire entre ces deux valeurs avant d'envoyer sa réponse.
              </p>
            </CardContent>
          </Card>

          {/* Filters & Schedule */}
          <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
              <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                <Filter className="w-6 h-6 text-primary" />
                Filtres & Horaires
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Contrôlez qui reçoit des réponses et quand</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-lg bg-primary/5 border border-primary/10 group hover:bg-primary/10 transition-all duration-200 shadow-sm ai-schedule-toggle">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">Activer le Planning</Label>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">L'IA ne répondra que pendant les heures définies</p>
                  </div>
                  <Switch 
                    checked={formData.schedule_enabled}
                    onCheckedChange={(c) => setFormData({...formData, schedule_enabled: c})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {formData.schedule_enabled && (
                  <div className="space-y-6 animate-in slide-in-from-top-4 duration-300 bg-slate-50/50 dark:bg-muted/10 p-6 rounded-lg border-2 border-slate-100 dark:border-primary/5">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Configuration des Horaires</span>
                    </div>
                    
                    <div className="space-y-4">
                      {days.map((day) => {
                        const config = parseSchedule(formData.schedule_config)[day.id] || { enabled: false, start: "09:00", end: "18:00" }
                        return (
                          <div key={day.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white dark:bg-card border border-slate-100 dark:border-primary/5 shadow-sm">
                            <div className="flex items-center gap-4 min-w-[120px]">
                              <Switch 
                                checked={config.enabled}
                                onCheckedChange={(c) => updateSchedule(day.id, 'enabled', c)}
                                className="scale-90"
                              />
                              <Label className="text-[10px] font-bold uppercase tracking-wider">{day.label}</Label>
                            </div>
                            
                            {config.enabled && (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase text-muted-foreground">De</span>
                                  <Input 
                                    type="time" 
                                    value={config.start} 
                                    onChange={(e) => updateSchedule(day.id, 'start', e.target.value)}
                                    className="h-8 w-24 text-[10px] font-bold"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase text-muted-foreground">À</span>
                                  <Input 
                                    type="time" 
                                    value={config.end} 
                                    onChange={(e) => updateSchedule(day.id, 'end', e.target.value)}
                                    className="h-8 w-24 text-[10px] font-bold"
                                  />
                                </div>
                              </div>
                            )}
                            {!config.enabled && (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">Désactivé</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-primary/5 ai-filters-section">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Whitelist (N°)
                    </Label>
                    <Input 
                      value={formData.whitelist}
                      onChange={(e) => setFormData({...formData, whitelist: e.target.value})}
                      placeholder="237..., 237..."
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Blacklist (N°)
                    </Label>
                    <Input 
                      value={formData.blacklist}
                      onChange={(e) => setFormData({...formData, blacklist: e.target.value})}
                      placeholder="237..., 237..."
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60">Mots-clés Déclencheurs</Label>
                    <Input 
                      value={formData.keywords_trigger}
                      onChange={(e) => setFormData({...formData, keywords_trigger: e.target.value})}
                      placeholder="prix, commande, aide"
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 opacity-60">Mots-clés Ignorés</Label>
                    <Input 
                      value={formData.keywords_ignore}
                      onChange={(e) => setFormData({...formData, keywords_ignore: e.target.value})}
                      placeholder="stop, merci, aurevoir"
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-12 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
