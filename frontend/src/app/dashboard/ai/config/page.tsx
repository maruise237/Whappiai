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
  Settings,
  MessageSquare,
  Wrench,
  ShieldCheck,
  Eye,
  Trophy,
  Check
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn, getFriendlyErrorMessage } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
      toast.error(getFriendlyErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div className="w-12 h-12 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Chargement de l'IA...</p>
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
    <div className="max-w-[1400px] mx-auto pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <AITour enabled={showTour} onExit={handleTourExit} isConfigPage={true} />

      {/* Header - SaaS Vibe */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-8 border-b border-border mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/ai')}
            className="h-10 w-10 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight uppercase">Config <span className="text-primary">IA</span></h1>
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border-emerald-500/10 h-5">
                {sessionId}
              </Badge>
            </div>
            <p className="text-xs font-medium text-muted-foreground opacity-60">Personnalisez le comportement de votre assistant WhatsApp</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="ghost"
            onClick={() => setShowTour(true)}
            className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            <HelpCircle className="w-4 h-4" />
            Besoin d'aide ?
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none shadow-lg shadow-primary/20 h-11 px-8 font-black uppercase tracking-widest text-[10px] rounded-md gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            {isSaving ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Enregistrer</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
        {/* Navigation Latérale - Sticky */}
        <div className="hidden lg:block sticky top-24 space-y-6">
          <div className="space-y-1">
            {[
              { id: 'intelligence', label: 'Intelligence', icon: Bot, desc: 'Mode et Modèle' },
              { id: 'automation', label: 'Automation', icon: Zap, desc: 'Contrôles auto' },
              { id: 'personality', label: 'Personality', icon: Sparkles, desc: 'Prompt et Ton' },
              { id: 'engine', label: 'Engine', icon: Cpu, desc: 'API et Backend' }
            ].map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-all duration-200 border border-transparent hover:border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  <section.icon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">{section.label}</div>
                  <div className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter">{section.desc}</div>
                </div>
              </a>
            ))}
          </div>

          <div className="p-6 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Status Session</span>
            </div>
            <p className="text-[9px] leading-relaxed font-bold uppercase tracking-tight opacity-60">
              Assurez-vous que votre session est <span className="text-emerald-600">connectée</span> pour que l'IA puisse répondre.
            </p>
          </div>
        </div>

        {/* Contenu - Sections directes */}
        <div className="space-y-20">
          {/* Section: Intelligence */}
          <section id="intelligence" className="scroll-mt-24 space-y-8">
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                <Bot className="w-6 h-6 text-primary" />
                Intelligence & Mode
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Définissez la logique de réponse de votre IA</p>
            </div>

            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0 space-y-8">
                {/* Activation Toggle */}
                <div className="flex items-center justify-between p-6 rounded-xl bg-card border border-border/50 shadow-sm hover:border-primary/20 transition-all">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-foreground">Robot Assistant</Label>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-60">Réponses automatiques via WhatsApp</p>
                  </div>
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(c) => setFormData({ ...formData, enabled: c })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Mode Selector - Visual Tiles */}
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 ml-1">Mode de fonctionnement</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'bot', name: 'Autonome', icon: Bot, desc: 'Réponses instantanées', long: 'Répond à tous les messages sans intervention humaine.', color: 'emerald' },
                      { id: 'hybrid', name: 'Hybride', icon: Cpu, desc: 'Délai de sécurité', long: 'Attend quelques secondes pour vous laisser le temps de répondre.', color: 'amber' },
                      { id: 'human', name: 'Assistant', icon: Sparkles, desc: 'Suggestions draft', long: 'Prépare la réponse mais nécessite votre validation.', color: 'blue' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setFormData({ ...formData, mode: m.id })}
                        className={cn(
                          "group relative flex flex-col p-6 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden h-full",
                          formData.mode === m.id
                            ? "border-primary bg-primary/[0.03] shadow-inner"
                            : "border-border bg-card hover:bg-slate-50 dark:hover:bg-muted/10 hover:border-border/80"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 shadow-sm",
                          formData.mode === m.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-secondary text-muted-foreground"
                        )}>
                          <m.icon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 relative z-10">
                          <div className="text-[11px] font-black uppercase tracking-widest group-hover:text-primary transition-colors">{m.name}</div>
                          <div className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter mb-2">{m.desc}</div>
                          <p className="text-[9px] leading-relaxed font-medium text-muted-foreground opacity-80 group-hover:opacity-100 transition-opacity">
                            {m.long}
                          </p>
                        </div>
                        {formData.mode === m.id && (
                          <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Automation */}
          <section id="automation" className="scroll-mt-24 space-y-8">
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary" />
                Automatisation & Contrôle
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Personnalisez le déclenchement intelligent</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Désactivation au tapage", icon: MessageSquare, sub: "L'IA s'arrête si vous commencez à écrire", prop: "deactivate_on_typing" },
                { label: "Désactivation à la lecture", icon: Eye, sub: "L'IA attend que vous lisiez le message", prop: "deactivate_on_read" },
                { label: "Lecture automatique", icon: ShieldCheck, sub: "Marque les messages comme 'Vu' lors de la réponse", prop: "read_on_reply" },
                { label: "Rejet d'appels", icon: ShieldAlert, sub: "Bloque les appels WhatsApp entrants", prop: "reject_calls", danger: true }
              ].map((item, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between p-6 rounded-xl border border-border/50 bg-card shadow-sm hover:border-primary/20 transition-all group",
                  item.danger && formData.reject_calls && "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all group-hover:bg-primary/10 group-hover:text-primary shadow-inner",
                      item.danger && formData.reject_calls ? "bg-red-500/10 text-red-500" : "bg-secondary text-muted-foreground"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-foreground">{item.label}</Label>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-40">{item.sub}</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData[item.prop as keyof typeof formData] as boolean}
                    onCheckedChange={(c) => setFormData({ ...formData, [item.prop]: c })}
                    className={cn(
                      "scale-110",
                      item.danger ? "data-[state=checked]:bg-red-600" : "data-[state=checked]:bg-primary"
                    )}
                  />
                </div>
              ))}
            </div>

            <Card className="border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-border/50 p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5" /> Simulation Humaine
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Protection Anti-Boucle</Label>
                      <Switch
                        checked={formData.random_protection_enabled}
                        onCheckedChange={(c) => setFormData({ ...formData, random_protection_enabled: c })}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                      Ignore aléatoirement certains messages pour briser les boucles infinies entre deux IA et paraître plus naturel.
                    </p>

                    {formData.random_protection_enabled && (
                      <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary">
                          <span>Taux d'échec : {Math.round(formData.random_protection_rate * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.5"
                          step="0.01"
                          value={formData.random_protection_rate}
                          onChange={(e) => setFormData({ ...formData, random_protection_rate: parseFloat(e.target.value) })}
                          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-[300px] space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Délai de réponse (s)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.reply_delay}
                          onChange={(e) => setFormData({ ...formData, reply_delay: parseInt(e.target.value) || 0 })}
                          className="h-11 bg-muted/20 border-border focus-visible:ring-primary/20 text-xs font-bold"
                        />
                        <Zap className="absolute right-3 top-3.5 w-4 h-4 text-muted-foreground/20" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mots-clés déclencheurs</Label>
                      <Input
                        value={formData.trigger_keywords}
                        onChange={(e) => setFormData({ ...formData, trigger_keywords: e.target.value })}
                        placeholder="ia, robot..."
                        className="h-11 bg-muted/20 border-border focus-visible:ring-primary/20 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Personality */}
          <section id="personality" className="scroll-mt-24 space-y-8">
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                Personnalité de l'IA
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Donnez un ton et un rôle à votre assistant</p>
            </div>

            <Card className="border border-border/50 bg-card overflow-hidden shadow-sm">
              <CardContent className="p-8 space-y-8">
                {Object.keys(templates).length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Modèles de rôles</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {Object.values(templates).slice(0, 4).map((template: any) => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setFormData({ ...formData, prompt: template.prompt });
                            toast.success(`Profil "${template.name}" activé`);
                          }}
                          className="flex flex-col items-start p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
                        >
                          <span className="text-[10px] font-black uppercase tracking-tight group-hover:text-primary transition-colors">{template.name}</span>
                          <span className="text-[8px] font-bold text-muted-foreground opacity-40 uppercase tracking-tighter line-clamp-1">{template.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Prompt Système (Instructions)</Label>
                    <Badge variant="ghost" className="text-[8px] font-bold opacity-30">{formData.prompt.length} CHARS</Badge>
                  </div>
                  <Textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    className="min-h-[200px] max-h-[300px] overflow-y-auto resize-none p-8 text-sm leading-relaxed bg-muted/20 border-border focus-visible:ring-primary/20 shadow-inner rounded-xl"
                    placeholder="Tu es un assistant commercial..."
                  />

                </div>

                <div className="flex items-center gap-4 p-5 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 leading-relaxed">
                    L'IA suivra strictement ces instructions. Plus vous êtes précis sur le <span className="text-primary font-black">TON</span> et le <span className="text-primary font-black">BUT</span>, meilleurs seront les résultats.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Engine */}
          <section id="engine" className="scroll-mt-24 space-y-8">
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                <Cpu className="w-6 h-6 text-primary" />
                Moteur & Performance
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Configurez la puissance de calcul</p>
            </div>

            <Card className="border border-border/50 bg-card/60 shadow-sm">
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Modèle Sélectionné</Label>
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
                      <SelectTrigger className="h-12 border-border bg-muted/20 text-xs font-black uppercase tracking-widest rounded-lg">
                        <SelectValue placeholder="Choisir un modèle" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id} className="text-[10px] font-bold uppercase tracking-widest py-3">
                            {model.name} {model.is_default && <span className="ml-2 opacity-30">(Default)</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isAdmin && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Custom Endpoint</Label>
                        <Input
                          value={formData.endpoint}
                          onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                          className="h-11 bg-muted/20 border-border text-[10px] font-mono"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">API Key Override</Label>
                        <Input
                          type="password"
                          value={formData.key}
                          onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                          className="h-11 bg-muted/20 border-border text-[10px] font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {!isAdmin && (
                    <div className="flex items-center gap-4 p-6 rounded-lg bg-secondary/50 border border-border">
                      <ShieldAlert className="w-5 h-5 text-muted-foreground/30" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        Configuration avancée gérée par l'administrateur.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
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
