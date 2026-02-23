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

  if (isLoading) return <div className="p-8 text-center">Chargement...</div>
  if (!sessionId) return <div className="p-8 text-center">Session non spécifiée.</div>

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/ai')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Configuration du Bot</h1>
            <p className="text-xs text-muted-foreground font-mono">{sessionId}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" /> Enregistrer
        </Button>
      </div>

      {/* Bloc 1 : Identité & Comportement */}
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Identité & Intelligence</CardTitle>
                <CardDescription className="text-[10px]">Définissez qui est votre bot et comment il doit agir.</CardDescription>
              </div>
            </div>
            <Switch checked={formData.enabled} onCheckedChange={v => setFormData({...formData, enabled: v})} />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Prompt (Sa personnalité)</Label>
              <Textarea
                value={formData.prompt}
                onChange={e => setFormData({...formData, prompt: e.target.value})}
                className="min-h-[120px] text-sm leading-relaxed"
                placeholder="Ex: Tu es un assistant commercial poli et expert en immobilier..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Exigences strictes (Règles d'or)</Label>
              <Textarea
                value={formData.constraints}
                onChange={e => setFormData({...formData, constraints: e.target.value})}
                className="min-h-[80px] text-sm border-amber-500/20 focus-visible:ring-amber-500/50 bg-amber-500/[0.02]"
                placeholder="Ex: Ne jamais donner de prix sans devis. Toujours vouvoyer."
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mode de réponse</Label>
              <Select value={formData.mode} onValueChange={v => setFormData({...formData, mode: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot">100% Automatique</SelectItem>
                  <SelectItem value="hybrid">Hybride (IA + Main humaine)</SelectItem>
                  <SelectItem value="human">Mode Suggestion uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Modèle d'IA</Label>
              <Select value={formData.model} onValueChange={v => setFormData({...formData, model: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloc 2 : Savoir (Base de connaissances) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Book className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Savoir & Connaissances</CardTitle>
              <CardDescription className="text-[10px]">Ajoutez vos documents ou sites web pour que l'IA connaisse votre entreprise.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <KnowledgeBaseManager sessionId={sessionId} />
        </CardContent>
      </Card>

      {/* Bloc 3 : Réglages & Automatisation */}
      <div className="space-y-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className={cn("h-3 w-3", showAdvanced && "animate-spin-slow")} />
          {showAdvanced ? "Masquer les réglages experts" : "Afficher les réglages experts"}
        </button>

        {showAdvanced && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Automatisation & Webhooks</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 divide-y">
                <div className="py-4 space-y-4">
                  <ToggleRow label="Arrêt à la frappe" desc="Désactive l'IA si vous écrivez sur WhatsApp." value={formData.deactivate_on_typing} onChange={v => setFormData({...formData, deactivate_on_typing: v})} />
                  <ToggleRow label="Arrêt à la lecture" desc="L'IA attend que vous lisiez pour répondre." value={formData.deactivate_on_read} onChange={v => setFormData({...formData, deactivate_on_read: v})} />

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">Fenêtre de silence (min)</Label>
                      <Input type="number" value={formData.session_window} onChange={e => setFormData({...formData, session_window: parseInt(e.target.value) || 0})} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">Délai de réponse (sec)</Label>
                      <Input type="number" value={formData.reply_delay} onChange={e => setFormData({...formData, reply_delay: parseInt(e.target.value) || 0})} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>

                <div className="py-6">
                  <WebhookManager sessionId={sessionId} />
                </div>

                {isAdmin && (
                  <div className="py-6 space-y-4">
                    <p className="text-[10px] font-bold uppercase text-destructive">Paramètres API (Admin uniquement)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Endpoint personnalisé</Label>
                        <Input value={formData.endpoint} onChange={e => setFormData({...formData, endpoint: e.target.value})} className="h-8 text-[10px] font-mono" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Clé API</Label>
                        <Input type="password" value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} className="h-8 text-[10px] font-mono" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
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
