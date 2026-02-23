"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AITour } from "@/components/dashboard/ai-tour"
import {
  ArrowLeft,
  Save,
  Bot,
  Cpu,
  Sparkles,
  ShieldAlert,
  Zap,
  HelpCircle,
  MessageSquare,
  Wrench,
  ShieldCheck,
  Eye,
  Trophy,
  Check,
  Play,
  Brain,
  Terminal,
  Eraser,
  Copy,
  Settings2,
  Lock,
  Globe,
  Waves
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
  const [activeTab, setActiveTab] = React.useState('intelligence')

  // Simulator state
  const [testInput, setTestInput] = React.useState("")
  const [testOutput, setTestOutput] = React.useState("")
  const [isTesting, setIsTesting] = React.useState(false)

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
    random_protection_rate: 0.1,
    temperature: 0.7,
    max_tokens: 1000
  })

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
          random_protection_rate: config.random_protection_rate ?? 0.1,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.max_tokens ?? 1000
        })

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
      toast.success("Configuration neuronale synchronisée ⚡")
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestAI = async () => {
    if (!testInput || !sessionId) return
    setIsTesting(true)
    setTestOutput("")
    try {
      const token = await getToken()
      const res = await api.sessions.testAI(sessionId, {
        ...formData,
        prompt: formData.prompt
      }, token || undefined)
      setTestOutput(res || "L'IA n'a pas renvoyé de réponse.")
    } catch (error: any) {
      toast.error("Échec de la simulation: " + error.message)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Brain className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl font-black uppercase tracking-tighter">Initialisation de la matrice...</p>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Syncing AI parameters</p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <ShieldAlert className="w-16 h-16 text-destructive opacity-20" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Instance Matrix introuvable</h2>
        <Button onClick={() => router.push('/dashboard/ai')} className="rounded-xl whappi-gradient border-none px-8 h-12 font-black uppercase tracking-widest text-[11px]">
          Retour au Hub
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-24 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <AITour enabled={showTour} onExit={handleTourExit} isConfigPage={true} />

      {/* Modern SaaS Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border -mx-4 px-4 sm:-mx-8 sm:px-8 py-6 ai-config-header">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/ai')}
              className="h-12 w-12 rounded-2xl bg-secondary hover:bg-primary hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight uppercase leading-none">Command <span className="text-primary">Center</span></h1>
                <Badge variant="outline" className="font-black text-[10px] uppercase tracking-[0.2em] bg-primary/5 text-primary border-primary/10 px-3 h-6">
                  {sessionId}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Session Synchronisée</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowTour(true)}
              className="hidden lg:flex rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] gap-3"
            >
              <HelpCircle className="w-4 h-4" /> Help
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 md:flex-none h-12 px-10 rounded-xl font-black uppercase tracking-widest text-[11px] whappi-gradient border-none shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all ai-save-button"
            >
              {isSaving ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-3" />
              ) : (
                <Save className="w-4 h-4 mr-3" />
              )}
              Sync Matrix
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_400px] gap-12 items-start">
        {/* Navigation Sidebar */}
        <aside className="hidden xl:flex flex-col gap-2 sticky top-36">
          {[
            { id: 'intelligence', label: 'Neural Engine', icon: Cpu, desc: 'Model & Strategy' },
            { id: 'automation', label: 'Safety Guard', icon: Zap, desc: 'Automation Rules' },
            { id: 'personality', label: 'Persona', icon: Sparkles, desc: 'Tone & Logic' },
            { id: 'advanced', label: 'Advanced Tuning', icon: Settings2, desc: 'Hyper-parameters' }
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveTab(section.id)
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={cn(
                "group flex items-center gap-5 p-4 rounded-2xl transition-all duration-300 border text-left",
                activeTab === section.id
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                  : "bg-transparent border-transparent hover:bg-primary/5 hover:border-primary/10 text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                activeTab === section.id ? "bg-white/20" : "bg-slate-100 dark:bg-white/5 group-hover:bg-primary group-hover:text-white"
              )}>
                <section.icon className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-[12px] font-black uppercase tracking-widest">{section.label}</div>
                <div className={cn(
                  "text-[9px] font-bold uppercase tracking-tight opacity-40",
                  activeTab === section.id && "text-white opacity-80"
                )}>{section.desc}</div>
              </div>
            </button>
          ))}
        </aside>

        {/* Main Content Modules */}
        <main className="space-y-24">
          {/* Module: Intelligence */}
          <section id="intelligence" className="scroll-mt-36 space-y-10">
            <div className="flex items-center gap-5 px-2">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                <Brain className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Neural Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-50">Operational strategy & logic</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <Card className="rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 bg-white dark:bg-card overflow-hidden shadow-2xl">
                <CardContent className="p-10 space-y-12">
                  <div className="flex items-center justify-between p-8 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner group transition-all hover:bg-primary/[0.08]">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                        <Bot className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xl font-black uppercase tracking-tighter">AI Activation</Label>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50">Deploy neural responses on WhatsApp</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.enabled}
                      onCheckedChange={(c) => setFormData({ ...formData, enabled: c })}
                      className="data-[state=checked]:bg-primary scale-150"
                    />
                  </div>

                  <div className="space-y-6 ai-mode-selector">
                    <div className="flex items-center gap-2 ml-2">
                      <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Mode de déploiement</Label>
                      <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-muted-foreground/40 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-[10px]">Détermine si l'IA répond seule ou vous laisse la main.</p>
                        </TooltipContent>
                      </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { id: 'bot', name: 'Autonome', icon: Bot, desc: 'Full Auto-reply', long: 'Répond instantanément à chaque message.', color: 'emerald' },
                        { id: 'hybrid', name: 'Hybride', icon: Waves, desc: 'Guard Mode', long: 'Attend un délai pour permettre une réponse humaine.', color: 'amber' },
                        { id: 'human', name: 'Draft', icon: Terminal, desc: 'Human-Verify', long: 'Génère des brouillons mais n\'envoie rien.', color: 'blue' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setFormData({ ...formData, mode: m.id })}
                          className={cn(
                            "group relative flex flex-col p-8 rounded-3xl border-2 transition-all duration-500 text-left h-full overflow-hidden",
                            formData.mode === m.id
                              ? "border-primary bg-primary/[0.02] shadow-xl"
                              : "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 hover:border-primary/20"
                          )}
                        >
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 shadow-xl",
                            formData.mode === m.id ? "bg-primary text-white" : "bg-white dark:bg-card text-muted-foreground"
                          )}>
                            <m.icon className="w-7 h-7" />
                          </div>
                          <div className="space-y-2 relative z-10">
                            <div className="text-lg font-black uppercase tracking-tighter group-hover:text-primary transition-colors">{m.name}</div>
                            <div className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase tracking-widest mb-4">{m.desc}</div>
                            <p className="text-[10px] leading-relaxed font-medium text-muted-foreground opacity-80 group-hover:opacity-100 transition-opacity">
                              {m.long}
                            </p>
                          </div>
                          {formData.mode === m.id && (
                            <div className="absolute top-6 right-6">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Module: Automation */}
          <section id="automation" className="scroll-mt-36 space-y-10">
            <div className="flex items-center gap-5 px-2">
              <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Safety Guard</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-50">Automation rules & anti-loop</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Matrix Pause (Typing)", icon: MessageSquare, sub: "Stop IA if human is typing", prop: "deactivate_on_typing" },
                { label: "Matrix Pause (Read)", icon: Eye, sub: "Stop IA if message is read", prop: "deactivate_on_read" },
                { label: "Silent Sync", icon: Globe, sub: "Auto-read on AI response", prop: "read_on_reply" },
                { label: "Total Firewall", icon: Lock, sub: "Reject all incoming voice calls", prop: "reject_calls", danger: true }
              ].map((item, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between p-8 rounded-3xl border-2 transition-all duration-300 group",
                  item.danger && formData.reject_calls
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-slate-100 dark:border-white/5 bg-white dark:bg-card hover:border-primary/20"
                )}>
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-xl",
                      item.danger && formData.reject_calls ? "bg-red-500 text-white shadow-red-500/20" : "bg-slate-50 dark:bg-white/5 text-muted-foreground group-hover:text-primary"
                    )}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-xs font-black uppercase tracking-widest text-foreground">{item.label}</Label>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight opacity-40">{item.sub}</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData[item.prop as keyof typeof formData] as boolean}
                    onCheckedChange={(c) => setFormData({ ...formData, [item.prop]: c })}
                    className={cn(
                      "scale-125",
                      item.danger ? "data-[state=checked]:bg-red-600" : "data-[state=checked]:bg-primary"
                    )}
                  />
                </div>
              ))}
            </div>

            <Card className="rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 bg-white dark:bg-card overflow-hidden">
              <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Human Simulation</CardTitle>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Break loops & mimic human patterns</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Waves className="w-6 h-6" />
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-black uppercase tracking-widest">Anti-Loop Protection</Label>
                        <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground/40 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-[10px]">Empêche deux IA de se répondre à l'infini en simulant une "hésitation" humaine.</p>
                          </TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Switch
                        checked={formData.random_protection_enabled}
                        onCheckedChange={(c) => setFormData({ ...formData, random_protection_enabled: c })}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    {formData.random_protection_enabled && (
                      <div className="space-y-6 p-8 rounded-2xl bg-slate-50/50 dark:bg-white/2 border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-500">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Probability Rate</span>
                          <span className="text-2xl font-black tracking-tighter text-primary">{Math.round(formData.random_protection_rate * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.5"
                          step="0.01"
                          value={formData.random_protection_rate}
                          onChange={(e) => setFormData({ ...formData, random_protection_rate: parseFloat(e.target.value) })}
                          className="w-full h-3 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-[9px] font-medium text-muted-foreground text-center uppercase tracking-widest opacity-60">Higher rate = more human randomness</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-1/3 space-y-8">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Network Delay (seconds)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formData.reply_delay}
                          onChange={(e) => setFormData({ ...formData, reply_delay: parseInt(e.target.value) || 0 })}
                          className="h-14 rounded-2xl bg-slate-50 dark:bg-white/2 border-2 border-slate-100 dark:border-white/5 font-black text-xl shadow-inner px-8"
                        />
                        <Zap className="absolute right-6 top-5 w-4 h-4 text-primary opacity-20" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Trigger Protocols</Label>
                      <Input
                        value={formData.trigger_keywords}
                        onChange={(e) => setFormData({ ...formData, trigger_keywords: e.target.value })}
                        placeholder="ia, help, bot..."
                        className="h-14 rounded-2xl bg-slate-50 dark:bg-white/2 border-2 border-slate-100 dark:border-white/5 font-bold text-xs shadow-inner px-8"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Module: Personality */}
          <section id="personality" className="scroll-mt-36 space-y-10">
            <div className="flex items-center gap-5 px-2">
              <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-500">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Persona Logic</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-50">Tone, role & system instructions</p>
              </div>
            </div>

            <Card className="rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 bg-white dark:bg-card overflow-hidden shadow-2xl">
              <CardContent className="p-10 space-y-12">
                <div className="space-y-6 ai-prompt-area">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Neural Matrix (System Prompt)</Label>
                      <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-muted-foreground/40 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                          <p className="text-[10px]">La "bible" de votre assistant. Décrivez son rôle, ce qu'il sait, et comment il doit s'adresser aux clients.</p>
                        </TooltipContent>
                      </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black px-4">Beta Pro</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.values(templates).slice(0, 4).map((template: any) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setFormData({ ...formData, prompt: template.prompt });
                          toast.success(`Matrix synced with: ${template.name}`);
                        }}
                        className="flex flex-col items-start p-6 rounded-3xl border-2 border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/2 hover:border-primary/50 hover:bg-primary/[0.02] transition-all group text-left"
                      >
                        <span className="text-sm font-black uppercase tracking-tighter group-hover:text-primary transition-colors">{template.name}</span>
                        <span className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase tracking-widest line-clamp-1 mt-1">{template.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 ai-prompt-area">
                  <div className="flex items-center justify-between px-2">
                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Neural Matrix (System Prompt)</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[8px] font-black px-3">{formData.prompt.length} TOKENS</Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(formData.prompt);
                            toast.success("Prompt copié dans le presse-papier");
                          }}
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, prompt: ""})} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                          <Eraser className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="relative group">
                    <Textarea
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                      className="min-h-[300px] max-h-[500px] overflow-y-auto resize-none p-10 text-base leading-relaxed bg-slate-50 dark:bg-white/2 border-2 border-slate-100 dark:border-white/5 focus-visible:ring-primary/20 shadow-inner rounded-[2rem] font-medium"
                      placeholder="Define the AI mission and constraints..."
                    />
                    <div className="absolute top-6 left-6 pointer-events-none opacity-5">
                      <Terminal className="w-12 h-12" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-8 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 shadow-lg">
                    <Wrench className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 leading-relaxed">
                    The prompt is the <span className="text-primary font-black">CORE SOURCE</span> of the AI logic.
                    Be specific about identity, tone, and forbidden topics to maintain 100% brand safety.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Module: Advanced */}
          <section id="advanced" className="scroll-mt-36 space-y-10">
            <div className="flex items-center gap-5 px-2">
              <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
                <Settings2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Advanced Tuning</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-50">Model hyper-parameters & API keys</p>
              </div>
            </div>

            <Card className="rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 bg-white dark:bg-card overflow-hidden shadow-2xl">
              <CardContent className="p-10 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-10">
                    <div className="space-y-4 ai-model-selector">
                      <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Core Engine Model</Label>
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
                        <SelectTrigger className="h-16 rounded-2xl border-2 border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 font-black text-xs uppercase tracking-widest shadow-inner">
                          <SelectValue placeholder="Select Intelligence Model" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2 border-slate-100 dark:border-white/5 shadow-2xl">
                          {availableModels.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="text-[11px] font-black uppercase tracking-widest py-4 cursor-pointer">
                              {model.name} {model.is_default && "⚡"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-6 p-8 rounded-3xl bg-secondary/30 border border-border/50">
                      <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Creativity (Temp)</span>
                        <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground/40 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-[10px]">Contrôle le hasard. **0.0** est très sérieux et répétitif, **1.0** et plus est créatif et imprévisible.</p>
                          </TooltipContent>
                        </Tooltip>
                        </TooltipProvider>
                      </div>
                        <span className="text-lg font-black text-primary">{formData.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-10">
                    {isAdmin ? (
                      <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                        <div className="space-y-4">
                          <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Custom Neural Endpoint</Label>
                          <Input
                            value={formData.endpoint}
                            onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                            className="h-16 rounded-2xl bg-slate-50/50 dark:bg-white/2 border-2 border-slate-100 dark:border-white/5 font-mono text-[11px] shadow-inner px-8"
                          />
                        </div>
                        <div className="space-y-4">
                          <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Secure API Key</Label>
                          <div className="relative">
                            <Input
                              type="password"
                              value={formData.key}
                              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                              className="h-16 rounded-2xl bg-slate-50/50 dark:bg-white/2 border-2 border-slate-100 dark:border-white/5 font-mono text-[11px] shadow-inner px-8"
                            />
                            <ShieldAlert className="absolute right-6 top-6 w-4 h-4 text-primary opacity-20" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-10 rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5 space-y-6">
                        <div className="p-5 rounded-full bg-slate-50 dark:bg-white/5">
                          <Lock className="w-10 h-10 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center leading-relaxed">
                          Infrastructure configuration managed by administrator.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  )
}

export default function AIConfigPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <AIConfigForm />
    </React.Suspense>
  )
}
