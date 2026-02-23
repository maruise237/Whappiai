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
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        toast.error("Échec du chargement de la configuration")
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

  if (isLoading) return <div className="p-8 text-center">Chargement...</div>
  if (!sessionId) return <div className="p-8 text-center">Session non spécifiée.</div>

  const sections = [
    { id: 'intelligence', label: 'Intelligence', icon: Bot },
    { id: 'automation', label: 'Automatisation', icon: Zap },
    { id: 'personality', label: 'Personnalité', icon: Sparkles },
    { id: 'engine', label: 'Moteur', icon: Cpu }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/ai')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Configuration IA</h1>
            <p className="text-sm text-muted-foreground">Session : {sessionId}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        <nav className="hidden lg:block sticky top-24 space-y-1">
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground transition-colors">
              <s.icon className="h-4 w-4" />
              {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {/* Intelligence */}
          <section id="intelligence" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Intelligence</h2>
              <p className="text-sm text-muted-foreground">Comportement de base et mode.</p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-6">
                <ToggleRow
                  label="Activer l&apos;IA"
                  desc="Activez les réponses automatiques pour cette session."
                  value={formData.enabled}
                  onChange={v => setFormData({...formData, enabled: v})}
                />
                <div className="space-y-3">
                  <Label className="text-xs font-medium uppercase text-muted-foreground">Mode de réponse</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'bot', name: 'Bot', desc: '100% Auto', icon: Bot },
                      { id: 'hybrid', name: 'Hybride', desc: 'Délai 5s', icon: Zap },
                      { id: 'human', name: 'Humain', desc: 'Brouillon', icon: Sparkles }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setFormData({...formData, mode: m.id})}
                        className={cn(
                          "flex flex-col gap-2 p-4 text-left border rounded-lg transition-colors",
                          formData.mode === m.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                        )}
                      >
                        <m.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Automation */}
          <section id="automation" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Automatisation</h2>
              <p className="text-sm text-muted-foreground">Contrôles de déclenchement et de réponse.</p>
            </div>
            <Card>
              <CardContent className="p-6 divide-y">
                <ToggleRow label="Arrêt à la frappe" desc="Désactive l&apos;IA si vous commencez à écrire." value={formData.deactivate_on_typing} onChange={v => setFormData({...formData, deactivate_on_typing: v})} />
                <ToggleRow label="Arrêt à la lecture" desc="L&apos;IA attend que vous lisiez les messages." value={formData.deactivate_on_read} onChange={v => setFormData({...formData, deactivate_on_read: v})} />
                <ToggleRow label="Confirmations de lecture" desc="Marquer comme lu quand l&apos;IA répond." value={formData.read_on_reply} onChange={v => setFormData({...formData, read_on_reply: v})} />
                <ToggleRow label="Rejeter les appels" desc="Bloquer automatiquement les appels entrants." value={formData.reject_calls} onChange={v => setFormData({...formData, reject_calls: v})} />

                <div className="py-6 space-y-4">
                  <p className="text-sm font-medium">Simulation humaine</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Délai de réponse (secondes)</Label>
                      <Input type="number" value={formData.reply_delay} onChange={e => setFormData({...formData, reply_delay: parseInt(e.target.value) || 0})} className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Mots-clés déclencheurs</Label>
                      <Input value={formData.trigger_keywords} onChange={e => setFormData({...formData, trigger_keywords: e.target.value})} placeholder="ia, aide..." className="h-9" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Personality */}
          <section id="personality" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Personnalité</h2>
              <p className="text-sm text-muted-foreground">Instructions et prompt système.</p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-4">
                <Label className="text-xs font-medium uppercase text-muted-foreground">Prompt Système</Label>
                <Textarea
                  value={formData.prompt}
                  onChange={e => setFormData({...formData, prompt: e.target.value})}
                  className="min-h-[200px] text-sm leading-relaxed"
                  placeholder="Agissez comme un assistant commercial utile..."
                />
              </CardContent>
            </Card>
          </section>

          {/* Engine */}
          <section id="engine" className="scroll-mt-24 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Moteur</h2>
              <p className="text-sm text-muted-foreground">Paramètres du modèle et de l'API.</p>
            </div>
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-muted-foreground">Modèle IA</Label>
                  <Select value={formData.model} onValueChange={v => {
                    const m = availableModels.find(mod => mod.id === v);
                    setFormData({...formData, model: v, endpoint: m?.endpoint || formData.endpoint})
                  }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isAdmin && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Endpoint personnalisé</Label>
                      <Input value={formData.endpoint} onChange={e => setFormData({...formData, endpoint: e.target.value})} className="h-9 font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Clé API personnalisée</Label>
                      <Input type="password" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="h-9 font-mono text-xs" />
                    </div>
                  </div>
                )}
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
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}

export default function AIConfigPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <AIConfigForm />
    </React.Suspense>
  )
}
