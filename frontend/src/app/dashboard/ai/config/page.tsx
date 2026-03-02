"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Brain,
  Zap,
  Cpu,
  User,
  Sparkles,
  Bot,
  Terminal,
  MessageSquare,
  ShieldAlert,
  Calendar,
  Sliders
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
import { cn, ensureString, safeRender } from "@/lib/utils"

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
      const [aiData, modelsData, calData] = await Promise.all([
        api.sessions.getAI(sessionId, token || undefined),
        api.ai.listModels(token || undefined),
        api.cal.getStatus(token || undefined).catch(() => ({}))
      ])
      setConfig({
        ...aiData,
        ai_cal_enabled: !!calData?.ai_cal_enabled,
        ai_cal_video_allowed: !!calData?.ai_cal_video_allowed
      })
      setModels(Array.isArray(modelsData) ? modelsData : [])
    } catch (e) {
      toast.error("&Eacute;chec du chargement de la configuration")
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
      toast.success("Intelligence mise &agrave; jour avec succ&egrave;s")
    } catch (e) {
      toast.error("Erreur lors de l&apos;enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  const isAdmin = user?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement...</div>
  if (!sessionId) return <div className="p-12 text-center text-muted-foreground">Session non trouv&eacute;e</div>

  const sections = [
    { id: 'intelligence', name: 'Intelligence', icon: Brain },
    { id: 'automation', name: 'Automation', icon: Zap },
    { id: 'personality', name: 'Personnalit&eacute;', icon: User },
    { id: 'scheduling', name: 'Rendez-vous', icon: Calendar },
    { id: 'engine', name: 'Moteur API', icon: Cpu },
  ]

  const modes = [
    { id: 'bot', name: 'Automatique', desc: 'IA g&egrave;re tout', icon: Bot },
    { id: 'keyword', name: 'Mots-cl&eacute;s', desc: 'Z&eacute;ro IA, uniquement mots-cl&eacute;s', icon: Terminal },
  ]

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold">R&eacute;glages IA : {safeRender(sessionId)}</h1>
            <p className="text-sm text-muted-foreground">Configurez finement le comportement de l&apos;assistant.</p>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Sparkles className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        <nav className="flex flex-row lg:flex-col gap-1 sticky top-14 lg:top-24 bg-background/95 backdrop-blur z-10 py-2 lg:py-0 overflow-x-auto no-scrollbar border-b lg:border-none">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id)
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              data-active={activeSection === section.id}
              className="flex-none lg:w-full flex items-center gap-2 px-3 py-2 text-xs lg:text-sm rounded-md hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground data-[active=true]:font-medium transition-colors whitespace-nowrap"
            >
              <section.icon className="h-4 w-4" />
              <span dangerouslySetInnerHTML={{ __html: section.name }} />
            </button>
          ))}
        </nav>

        <div className="space-y-12">
          <section id="intelligence" className="scroll-mt-24 space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Activation Intelligence</p>
                <p className="text-xs text-muted-foreground">D&eacute;sactivez pour stopper toute r&eacute;ponse IA.</p>
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

            {(config?.mode === 'keyword' || config?.mode === 'bot') && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Label className="text-xs font-semibold">Mots-cl&eacute;s d&eacute;clencheurs de l&apos;IA</Label>
                <Input
                  placeholder="tarif, prix, commander, aide..."
                  value={config?.trigger_keywords || ""}
                  onChange={e => setConfig({...config, trigger_keywords: e.target.value})}
                  className="bg-card border-border"
                />
                <p className="text-[10px] text-muted-foreground italic">
                  S&eacute;parez les mots par des virgules. Si rempli, l&apos;IA ne r&eacute;pondra que si l&apos;un de ces mots est pr&eacute;sent.
                </p>
              </div>
            )}
          </section>

          <Separator />

          <section id="automation" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Automatisation &amp; S&eacute;curit&eacute;</h3>
              <p className="text-xs text-muted-foreground">Comportement du bot lors des interactions.</p>
            </div>

            <div className="border rounded-lg divide-y bg-card">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">R&eacute;pondre aux Tags</p>
                  <p className="text-xs text-muted-foreground">R&eacute;agir uniquement si cit&eacute; (@bot) dans les groupes.</p>
                </div>
                <Switch
                  checked={!!config?.respond_to_tags}
                  onCheckedChange={(v) => setConfig({...config, respond_to_tags: v})}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Rejet d&apos;appels</p>
                  <p className="text-xs text-muted-foreground">Raccrocher automatiquement lors d&apos;appels vocaux/vid&eacute;o.</p>
                </div>
                <Switch
                  checked={!!config?.reject_calls}
                  onCheckedChange={(v) => setConfig({...config, reject_calls: v})}
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Pause sur &eacute;criture</p>
                  <p className="text-xs text-muted-foreground">D&eacute;sactiver l&apos;IA quand vous tapez un message manuellement.</p>
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
                <CardDescription className="text-xs">Ajoute des d&eacute;lais al&eacute;atoires pour para&icirc;tre humain.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">D&eacute;lai de r&eacute;ponse (secondes)</Label>
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
              </CardContent>
            </Card>
          </section>

          <Separator />

          <section id="personality" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Personnalit&eacute; &amp; Instructions</h3>
              <p className="text-xs text-muted-foreground">D&eacute;finissez comment le bot doit s&apos;exprimer.</p>
            </div>

            <div className="space-y-2">
               <Label className="text-xs">Prompt Syst&egrave;me (Instructions)</Label>
               <Textarea
                 placeholder="Instructions pour l'IA..."
                 className="min-h-[200px] text-sm leading-relaxed border-border bg-card"
                 value={config?.prompt || ""}
                 onChange={e => setConfig({...config, prompt: e.target.value})}
               />
            </div>
          </section>

          <Separator />

          <section id="scheduling" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Rendez-vous Cal.com</h3>
              <p className="text-xs text-muted-foreground">G&eacute;rez la prise de rendez-vous automatique par l&apos;IA.</p>
            </div>

            <div className="border rounded-lg divide-y bg-card">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Activer l&apos;assistant Cal.com</p>
                  <p className="text-xs text-muted-foreground">Permet &agrave; l&apos;IA de consulter votre agenda et prendre des RDV.</p>
                </div>
                <Switch
                  checked={!!config?.ai_cal_enabled}
                  onCheckedChange={async (v) => {
                    const token = await getToken()
                    await api.cal.updateSettings({ ai_cal_enabled: v }, token || undefined)
                    setConfig({...config, ai_cal_enabled: v})
                  }}
                />
              </div>
            </div>
          </section>

          <Separator />

          <section id="engine" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Moteur &amp; Infrastructure API</h3>
              <p className="text-xs text-muted-foreground">Configuration technique de l&apos;IA (Admin uniquement).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Modèle LLM</Label>
                  <Select value={config?.model || (models.length > 0 ? models[0].model_name : "deepseek-chat")} onValueChange={(v) => setConfig({...config, model: v})}>
                     <SelectTrigger className="h-9">
                        <SelectValue placeholder="S&eacute;lectionnez un mod&egrave;le" />
                     </SelectTrigger>
                     <SelectContent>
                        {models.length === 0 ? (
                          <SelectItem value="deepseek-chat">Whappi AI (D&eacute;faut)</SelectItem>
                        ) : (
                          models.map(m => (
                            <SelectItem key={m.id} value={m.model_name || m.id}>{m.name}</SelectItem>
                          ))
                        )}
                     </SelectContent>
                  </Select>
               </div>
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
