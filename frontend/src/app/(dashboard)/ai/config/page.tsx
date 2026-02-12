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
    deactivate_on_typing: false,
    deactivate_on_read: false,
    trigger_keywords: "",
    reply_delay: 0,
    read_on_reply: false,
    reject_calls: false
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
          reject_calls: config.reject_calls ?? false
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
        <Button variant="link" onClick={() => router.push('/ai')} className="text-primary font-bold uppercase tracking-widest text-xs">Retour à la liste</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <AITour enabled={showTour} onExit={handleTourExit} isConfigPage={true} />
      
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

          {/* Automatic Controls */}
          <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
              <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                <Zap className="w-6 h-6 text-primary" />
                Contrôle Automatique & Déclencheurs
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">Gérez l'activation et la désactivation intelligente de l'IA</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border border-slate-100 dark:border-primary/5 transition-all hover:bg-slate-100 dark:hover:bg-muted/40 group shadow-sm duration-200">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Stop si j'écris</Label>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Désactive l'IA quand vous commencez à taper</p>
                  </div>
                  <Switch 
                    checked={formData.deactivate_on_typing}
                    onCheckedChange={(c) => setFormData({...formData, deactivate_on_typing: c})}
                    className="data-[state=checked]:bg-primary shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border border-slate-100 dark:border-primary/5 transition-all hover:bg-slate-100 dark:hover:bg-muted/40 group shadow-sm duration-200">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Stop si j'ai lu</Label>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Désactive l'IA dès que vous lisez le message</p>
                  </div>
                  <Switch 
                    checked={formData.deactivate_on_read}
                    onCheckedChange={(c) => setFormData({...formData, deactivate_on_read: c})}
                    className="data-[state=checked]:bg-primary shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-6 rounded-lg bg-slate-50/50 dark:bg-muted/20 border border-slate-100 dark:border-primary/5 transition-all hover:bg-slate-100 dark:hover:bg-muted/40 group shadow-sm duration-200">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors text-foreground">Lu avant réponse</Label>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Marque le message comme vu avant de répondre</p>
                  </div>
                  <Switch 
                    checked={formData.read_on_reply}
                    onCheckedChange={(c) => setFormData({...formData, read_on_reply: c})}
                    className="data-[state=checked]:bg-primary shadow-sm"
                  />
                </div>

                <div className={cn(
                  "flex items-center justify-between p-6 rounded-lg border transition-all group shadow-sm duration-200",
                  formData.reject_calls 
                    ? "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/20 hover:bg-red-100 dark:hover:bg-red-950/40" 
                    : "bg-slate-50/50 dark:bg-muted/20 border-slate-100 dark:border-primary/5 hover:bg-slate-100 dark:hover:bg-muted/40"
                )}>
                  <div className="space-y-1">
                    <Label className={cn(
                      "text-[11px] font-black uppercase tracking-widest transition-colors",
                      formData.reject_calls ? "text-red-600 dark:text-red-400" : "text-foreground group-hover:text-primary"
                    )}>Rejet automatique d'appels</Label>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Rejeter les appels WhatsApp entrants</p>
                  </div>
                  <Switch 
                    checked={formData.reject_calls}
                    onCheckedChange={(c) => setFormData({...formData, reject_calls: c})}
                    className="data-[state=checked]:bg-red-600 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-primary/5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-3 opacity-60 ml-2">
                      <Zap className="w-4 h-4" /> Délai de réponse (s)
                    </Label>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary">
                      {formData.reply_delay}s
                    </Badge>
                  </div>
                  <Input 
                    type="number"
                    min="0"
                    max="60"
                    value={formData.reply_delay}
                    onChange={(e) => setFormData({...formData, reply_delay: parseInt(e.target.value) || 0})}
                    placeholder="Délai en secondes"
                    className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-14 rounded-lg font-medium text-xs shadow-inner transition-all duration-300"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-3 opacity-60 ml-2">
                      <Bot className="w-4 h-4" /> Mots-clés Déclencheurs
                    </Label>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary">Optionnel</Badge>
                  </div>
                  <Input 
                    value={formData.trigger_keywords}
                    onChange={(e) => setFormData({...formData, trigger_keywords: e.target.value})}
                    placeholder="ia, robot, help (séparés par des virgules)"
                    className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-14 rounded-lg font-medium text-xs shadow-inner transition-all duration-300"
                  />
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-2 italic">
                  Note: Si les mots-clés sont définis, l'IA ne répondra que si le message en contient un.
                </p>
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
        </div>

        <div className="lg:col-span-5 space-y-10">
          {/* API Config */}
          <Card className="border border-slate-200 dark:border-primary/10 shadow-xl rounded-lg overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl">
            <CardHeader className="p-8 border-b border-slate-100 dark:border-primary/5">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-4">
                  <Network className="w-6 h-6 text-primary" />
                  Moteur d'Intelligence
                </CardTitle>
                <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm border-primary/20 text-primary bg-primary/5">MODÈLE GLOBAL</Badge>
              </div>
              <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground opacity-60">
                Sélectionnez le modèle configuré par l'administrateur
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-10 ai-model-selector">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-3 opacity-60 ml-2">
                  <Cpu className="w-4 h-4" /> Modèle Sélectionné
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
                  <SelectTrigger className="h-14 border-2 border-slate-100 dark:border-primary/5 rounded-lg focus:ring-primary/20 font-bold text-[10px] uppercase tracking-widest bg-slate-50/50 dark:bg-muted/20 shadow-inner transition-all duration-300">
                    <SelectValue placeholder="Choisir un modèle" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl bg-white/95 dark:bg-card/95 backdrop-blur-xl p-2">
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="font-bold text-[10px] uppercase tracking-widest py-4 cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors rounded-lg mb-1">
                          {model.name} {model.is_default && <Badge className="ml-2 bg-primary/20 text-primary border-none text-[8px]">Par défaut</Badge>}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Aucun modèle disponible</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div className="space-y-10 pt-10 border-t border-slate-100 dark:border-primary/5">
                  <div className="flex items-center gap-3 px-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Accès Administrateur</span>
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-3 opacity-60 ml-2">
                      <Network className="w-4 h-4" /> Endpoint API (Custom)
                    </Label>
                    <Input 
                      value={formData.endpoint}
                      onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                      placeholder="https://api.deepseek.com/v1"
                      className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-16 rounded-lg font-mono text-[11px] shadow-inner transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-3 opacity-60 ml-2">
                      <KeyRound className="w-4 h-4" /> Clé API (Custom)
                    </Label>
                    <div className="relative group">
                      <Input 
                        type="password"
                        value={formData.key}
                        onChange={(e) => setFormData({...formData, key: e.target.value})}
                        placeholder="sk-................................"
                        className="bg-slate-50/50 dark:bg-muted/20 border-2 border-slate-100 dark:border-primary/5 focus-visible:ring-primary/20 h-16 rounded-lg pr-16 font-mono text-[11px] shadow-inner transition-all duration-300"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-6 text-slate-300 group-focus-within:text-primary transition-colors duration-200">
                        <KeyRound className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-2 italic">Laissez vide pour utiliser la clé globale du modèle.</p>
                  </div>
                </div>
              )}

              {!isAdmin && (
                <div className="p-6 bg-slate-50/50 dark:bg-muted/10 rounded-lg border border-slate-100 dark:border-primary/5 shadow-inner">
                  <div className="flex items-center gap-4 mb-3">
                    <ShieldAlert className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sécurité des Clés</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    Les clés API et endpoints sont gérés par l'administrateur. En tant qu'utilisateur, vous sélectionnez simplement le modèle souhaité.
                  </p>
                </div>
              )}
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
