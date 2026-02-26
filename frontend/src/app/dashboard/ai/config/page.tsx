"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Brain,
  Settings,
  Zap,
  Cpu,
  Clock,
  User,
  Sparkles,
  Bot,
  Terminal,
  MessageSquare,
  ShieldAlert,
  Sliders,
  Database
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function AIConfigContent() {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [config, setConfig] = React.useState<any>(null)
  const [models, setModels] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState('intelligence')

  const fetchData = React.useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const token = await getToken()
      const [aiData, modelsData] = await Promise.all([
        api.sessions.getAI(sessionId, token || undefined),
        api.ai.listModels(token || undefined)
      ])
      setConfig(aiData)
      setModels(modelsData || [])
    } catch (e) {
      toast.error("Échec du chargement de la configuration")
    } finally {
      setLoading(false)
    }
  }, [sessionId, getToken])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    if (!sessionId || !config) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateAI(sessionId, config, token || undefined)
      toast.success("Intelligence mise à jour avec succès")
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  const isAdmin = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === 'maruise237@gmail.com' || user?.publicMetadata?.role === 'admin'

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement...</div>
  if (!sessionId) return <div className="p-12 text-center text-muted-foreground">Session non trouvée</div>

  const sections = [
    { id: 'intelligence', name: 'Intelligence', icon: Brain },
    { id: 'automation', name: 'Automation', icon: Zap },
    { id: 'personality', name: 'Personnalité', icon: User },
    { id: 'engine', name: 'Moteur API', icon: Cpu },
  ]

  const modes = [
    { id: 'bot', name: 'Automatique', desc: 'IA gère tout', icon: Bot },
    { id: 'keyword', name: 'Mots-clés', desc: 'Zéro IA, uniquement mots-clés', icon: Terminal },
  ]

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold">Réglages IA : {sessionId}</h1>
            <p className="text-sm text-muted-foreground">Configurez finement le comportement de l&apos;assistant.</p>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Sparkles className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Sidebar Nav */}
        <nav className="space-y-1 sticky top-24">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id)
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              data-active={activeSection === section.id}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground data-[active=true]:font-medium transition-colors"
            >
              <section.icon className="h-4 w-4" />
              {section.name}
            </button>
          ))}
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          {/* Section Intelligence */}
          <section id="intelligence" className="scroll-mt-24 space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Activation Intelligence</p>
                <p className="text-xs text-muted-foreground">Désactivez pour stopper toute réponse IA.</p>
              </div>
              <Switch
                checked={!!config?.enabled}
                onCheckedChange={(v) => setConfig({...config, enabled: v})}
              />
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode de fonctionnement</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modes.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setConfig({...config, mode: m.id})}
                    className={cn(
                      "flex flex-col gap-2 p-4 text-left border rounded-lg transition-colors",
                      config?.mode === m.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <m.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {config?.mode === 'keyword' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-xs font-semibold">Mots-clés déclencheurs de l&apos;IA</Label>
                <Input
                  placeholder="tarif, prix, commander, aide..."
                  value={config?.trigger_keywords || ""}
                  onChange={e => setConfig({...config, trigger_keywords: e.target.value})}
                  className="bg-card border-border"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Séparez les mots par des virgules. L&apos;IA ne répondra que si l&apos;un de ces mots est présent.
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* Section Automation */}
          <section id="automation" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Automatisation & Sécurité</h3>
              <p className="text-xs text-muted-foreground">Comportement du bot lors des interactions.</p>
            </div>

            <div className="border rounded-lg divide-y bg-card">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Répondre aux Tags</p>
                  <p className="text-xs text-muted-foreground">Réagir uniquement si cité (@bot) dans les groupes.</p>
                </div>
                <Switch
                  checked={!!config?.respond_to_tags}
                  onCheckedChange={(v) => setConfig({...config, respond_to_tags: v})}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Rejet d&apos;appels</p>
                  <p className="text-xs text-muted-foreground">Raccrocher automatiquement lors d&apos;appels vocaux/vidéo.</p>
                </div>
                <Switch
                  checked={!!config?.reject_calls}
                  onCheckedChange={(v) => setConfig({...config, reject_calls: v})}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Pause sur écriture</p>
                  <p className="text-xs text-muted-foreground">Désactiver l&apos;IA quand vous tapez un message manuellement.</p>
                </div>
                <Switch
                  checked={!!config?.deactivate_on_typing}
                  onCheckedChange={(v) => setConfig({...config, deactivate_on_typing: v})}
                />
              </div>
            </div>

            <Card className="border-border bg-muted/30 shadow-none">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Simulation Humaine (Anti-Ban)</CardTitle>
                <CardDescription className="text-xs">Ajoute des délais aléatoires pour paraître humain.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Délai de réponse (secondes)</Label>
                    <span className="text-xs font-mono text-primary font-bold">{config?.delay_min || 1}s - {config?.delay_max || 5}s</span>
                  </div>
                  <Slider
                    defaultValue={[config?.delay_min || 1, config?.delay_max || 5]}
                    max={30}
                    step={1}
                    className="py-4"
                    onValueChange={([min, max]) => setConfig({...config, delay_min: min, delay_max: max})}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Min</Label>
                    <Input type="number" value={config?.delay_min || 1} onChange={e => setConfig({...config, delay_min: parseInt(e.target.value)})} className="h-8" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Max</Label>
                    <Input type="number" value={config?.delay_max || 5} onChange={e => setConfig({...config, delay_max: parseInt(e.target.value)})} className="h-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Section Personality */}
          <section id="personality" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Personnalité & Instructions</h3>
              <p className="text-xs text-muted-foreground">Définissez comment le bot doit s&apos;exprimer.</p>
            </div>

            <div className="space-y-4">
               <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modèles de ton</Label>
               <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'pro', name: 'Professionnel', icon: ShieldAlert },
                    { id: 'friendly', name: 'Amical', icon: MessageSquare },
                    { id: 'sales', name: 'Vendeur', icon: Zap },
                    { id: 'support', name: 'Support', icon: Sliders },
                  ].map(t => (
                    <Badge
                      key={t.id}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-primary/10 px-3 py-1 transition-colors"
                      onClick={() => setConfig({...config, prompt: `Tu es un assistant ${t.name.toLowerCase()}...`})}
                    >
                      {t.name}
                    </Badge>
                  ))}
               </div>
            </div>

            <div className="space-y-2">
               <Label className="text-xs">Prompt Système (Instructions)</Label>
               <Textarea
                 placeholder="Instructions pour l'IA..."
                 className="min-h-[200px] text-sm leading-relaxed border-border bg-card"
                 value={config?.prompt || ""}
                 onChange={e => setConfig({...config, prompt: e.target.value})}
               />
               <div className="flex flex-wrap gap-1 mt-2">
                  {['@{{name}}', '{{time}}', '{{date}}', '{{company}}'].map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] cursor-pointer font-mono hover:bg-primary/10 h-5"
                      onClick={() => setConfig({...config, prompt: (config.prompt || "") + tag})}
                    >
                      {tag}
                    </Badge>
                  ))}
               </div>
            </div>
          </section>

          <Separator />

          {/* Section Engine */}
          <section id="engine" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Moteur & Infrastructure API</h3>
              <p className="text-xs text-muted-foreground">Configuration technique de l&apos;IA (Admin uniquement).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Modèle LLM</Label>
                  <Select value={config?.model || "deepseek-chat"} onValueChange={(v) => setConfig({...config, model: v})}>
                     <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionnez un modèle" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="deepseek-chat">DeepSeek Chat (Défaut)</SelectItem>
                        {models.map(m => (
                          <SelectItem key={m.id} value={m.model_name || m.id}>{m.name}</SelectItem>
                        ))}
                        <Separator className="my-2" />
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                     </SelectContent>
                  </Select>
               </div>

               {isAdmin && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Endpoint Personnalisé</Label>
                      <Input
                        placeholder="https://api.openai.com/v1"
                        value={config?.api_endpoint || ""}
                        onChange={e => setConfig({...config, api_endpoint: e.target.value})}
                        className="h-9 font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Clé API (Secret)</Label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        value={config?.api_key || ""}
                        onChange={e => setConfig({...config, api_key: e.target.value})}
                        className="h-9 font-mono text-[11px]"
                      />
                    </div>
                  </>
               )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function AIConfigPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <AIConfigContent />
    </React.Suspense>
  )
}
