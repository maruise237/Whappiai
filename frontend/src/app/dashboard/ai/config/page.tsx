"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Bot,
  Cpu,
  Sparkles,
  Zap,
  ShieldCheck,
  Book,
  Webhook,
  Settings,
  BrainCircuit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { KnowledgeBaseManager } from "@/components/dashboard/knowledge-base-manager"
import { WebhookManager } from "@/components/dashboard/webhook-manager"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AIConfigPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <AIConfigForm />
    </React.Suspense>
  )
}

function AIConfigForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const { getToken } = useAuth()
  const { user: clerkUser } = useUser()

  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [availableModels, setAvailableModels] = React.useState<any[]>([])
  const [isAdmin, setIsAdmin] = React.useState(false)

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
    constraints: "",
    session_window: 5,
    respond_to_tags: false,
    reply_delay: 0,
    read_on_reply: false,
    reject_calls: false,
    random_protection_enabled: true,
    random_protection_rate: 0.1
  })

  React.useEffect(() => {
    const loadData = async () => {
      if (!sessionId) return
      try {
        const token = await getToken()
        const user = await api.auth.check(token || undefined)
        setIsAdmin(user?.role === 'admin' || clerkUser?.primaryEmailAddress?.emailAddress === 'maruise237@gmail.com')

        const models = await api.ai.listModels(token || undefined)
        setAvailableModels(models || [])
        const config = await api.sessions.getAI(sessionId, token || undefined)
        setFormData(prev => ({ ...prev, ...config }))
      } catch (error) {
        toast.error("Échec du chargement")
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
      toast.success("Configuration enregistrée")
    } catch (error: any) {
      toast.error("Échec de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  const [activeSection, setActiveSection] = React.useState("intelligence")

  if (isLoading) return <div className="p-8 text-center">Chargement...</div>
  if (!sessionId) return <div className="p-8 text-center">Session non spécifiée.</div>

  const sections = [
    { id: "intelligence", name: "Intelligence", icon: BrainCircuit },
    { id: "automation", name: "Automation", icon: Zap },
    { id: "personality", name: "Personnalité", icon: Sparkles },
    { id: "knowledge", name: "Connaissances", icon: Book },
    { id: "engine", name: "Moteur IA", icon: Cpu }
  ]

  const modes = [
    { id: "bot", name: "Auto", desc: "100% IA", icon: Bot },
    { id: "hybrid", name: "Hybride", desc: "IA + Main", icon: Cpu },
    { id: "human", name: "Suggest", desc: "Suggestion", icon: Users }
  ]

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header Sticky */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b mb-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/ai')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Configuration IA</h1>
              <p className="text-xs text-muted-foreground font-mono">{sessionId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-xs font-medium">IA Active</span>
              <Switch checked={formData.enabled} onCheckedChange={v => setFormData({...formData, enabled: v})} />
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" /> Enregistrer
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-12 items-start">
        {/* Sidebar Sticky */}
        <aside className="sticky top-24 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id)
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              data-active={activeSection === s.id}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground data-[active=true]:font-medium"
            >
              <s.icon className="h-4 w-4" />
              {s.name}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="space-y-16">
          {/* Section Intelligence */}
          <section id="intelligence" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground">Intelligence</h2>
              <p className="text-xs text-muted-foreground">Définissez le mode opératoire de votre assistant.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {modes.map(m => (
                <button
                  key={m.id}
                  onClick={() => setFormData({...formData, mode: m.id})}
                  className={cn(
                    "flex flex-col gap-2 p-4 text-left border rounded-lg transition-all",
                    formData.mode === m.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <m.icon className={cn("h-4 w-4", formData.mode === m.id ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{m.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Section Automation */}
          <section id="automation" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground">Automation</h2>
              <p className="text-xs text-muted-foreground">Paramètres de déclenchement et de simulation humaine.</p>
            </div>
            <Card>
              <CardContent className="p-0 divide-y">
                <div className="p-6 space-y-1">
                  <ToggleRow label="Répondre aux tags (@)" desc="L'IA répond lorsqu'elle est mentionnée dans un groupe." value={formData.respond_to_tags} onChange={v => setFormData({...formData, respond_to_tags: v})} />
                  <ToggleRow label="Arrêt à la frappe" desc="Désactive l'IA si vous écrivez sur WhatsApp." value={formData.deactivate_on_typing} onChange={v => setFormData({...formData, deactivate_on_typing: v})} />
                  <ToggleRow label="Arrêt à la lecture" desc="L'IA attend que vous lisiez pour répondre." value={formData.deactivate_on_read} onChange={v => setFormData({...formData, deactivate_on_read: v})} />
                  <ToggleRow label="Rejet d'appels" desc="Rejeter automatiquement les appels vocaux/vidéo." value={formData.reject_calls} onChange={v => setFormData({...formData, reject_calls: v})} />
                </div>
                <div className="p-6 bg-muted/30 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Simulation Humaine</Label>
                      <Badge variant="outline" className="text-[10px] bg-background">Expert</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-[10px] text-muted-foreground font-medium">Fenêtre de silence (min)</Label>
                          <span className="text-[10px] font-mono">{formData.session_window}m</span>
                        </div>
                        <Input type="number" value={formData.session_window} onChange={e => setFormData({...formData, session_window: parseInt(e.target.value) || 0})} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-[10px] text-muted-foreground font-medium">Délai de réponse (sec)</Label>
                          <span className="text-[10px] font-mono">{formData.reply_delay}s</span>
                        </div>
                        <Input type="number" value={formData.reply_delay} onChange={e => setFormData({...formData, reply_delay: parseInt(e.target.value) || 0})} className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section Personality */}
          <section id="personality" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground">Personnalité</h2>
              <p className="text-xs text-muted-foreground">Définissez l&apos;identité et les règles de conduite.</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Instruction principale (Prompt)</Label>
                <Textarea
                  value={formData.prompt}
                  onChange={e => setFormData({...formData, prompt: e.target.value})}
                  className="h-[240px] overflow-y-auto text-sm leading-relaxed resize-none bg-card shadow-inner"
                  placeholder="Tu es un assistant..."
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Contraintes & Règles strictes</Label>
                <Textarea
                  value={formData.constraints}
                  onChange={e => setFormData({...formData, constraints: e.target.value})}
                  className="h-[120px] overflow-y-auto text-sm border-amber-500/20 focus-visible:ring-amber-500/50 bg-amber-500/[0.02] resize-none"
                  placeholder="Ne jamais donner de prix..."
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Section Knowledge */}
          <section id="knowledge" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground">Connaissances</h2>
              <p className="text-xs text-muted-foreground">Base de données RAG pour des réponses précises.</p>
            </div>
            <Card>
              <CardContent className="p-6">
                <KnowledgeBaseManager sessionId={sessionId} />
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section Engine */}
          <section id="engine" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground">Moteur IA</h2>
              <p className="text-xs text-muted-foreground">Configuration technique de l&apos;API.</p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold">Modèle sélectionné</Label>
                  <Select value={formData.model} onValueChange={v => setFormData({...formData, model: v})}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground font-medium">API Endpoint</Label>
                      <Input value={formData.endpoint} onChange={e => setFormData({...formData, endpoint: e.target.value})} className="h-9 text-xs font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground font-medium">API Key</Label>
                      <Input type="password" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="h-9 text-xs font-mono" />
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <WebhookManager sessionId={sessionId} />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}
