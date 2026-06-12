"use client"

import * as React from "react"
import { useUser, useAuth } from "@clerk/clerk-react"
import { Bot, Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

type AIModel = {
  id?: number
  name: string
  provider: string
  endpoint: string
  model_name: string
  api_key: string
  description: string
  is_active: boolean
  is_default: boolean
  temperature: number
  max_tokens: number
}

const PROVIDERS = ["openai", "anthropic", "deepseek", "groq", "openrouter", "other"]

const EMPTY: AIModel = {
  name: "", provider: "deepseek", endpoint: "", model_name: "",
  api_key: "", description: "", is_active: true, is_default: false,
  temperature: 0.7, max_tokens: 4096,
}

export default function AIModelsPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [models, setModels] = React.useState<AIModel[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit" | "delete"; model?: AIModel } | null>(null)
  const [form, setForm] = React.useState<AIModel>(EMPTY)

  const isAdmin = user?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

  const apiFetch = async (path: string, opts: RequestInit = {}) => {
    const token = await getToken()
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}${path}`, {
      ...opts,
      headers: {
        ...opts.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || res.statusText)
    }
    return res.json()
  }

  const load = React.useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await apiFetch("/api/v1/admin/ai-models")
      setModels(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    load()
  }, [isAdmin, load])

  const openCreate = () => { setForm({ ...EMPTY }); setDialog({ mode: "create" }) }
  const openEdit = (m: AIModel) => { setForm({ ...m }); setDialog({ mode: "edit", model: m }) }
  const openDelete = (m: AIModel) => { setDialog({ mode: "delete", model: m }) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (dialog?.mode === "create") {
        await apiFetch("/api/v1/admin/ai-models", { method: "POST", body: JSON.stringify(form) })
      } else if (dialog?.mode === "edit" && dialog.model?.id) {
        await apiFetch(`/api/v1/admin/ai-models/${dialog.model.id}`, { method: "PUT", body: JSON.stringify(form) })
      }
      setDialog(null)
      load()
      toast.success(dialog?.mode === "create" ? "Modele ajoute" : "Modele mis a jour")
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!dialog?.model?.id) return
    setSaving(true)
    try {
      await apiFetch(`/api/v1/admin/ai-models/${dialog.model.id}`, { method: "DELETE" })
      setDialog(null)
      load()
      toast.success("Modele supprime")
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la suppression")
    } finally {
      setSaving(false)
    }
  }

  const setField = (k: keyof AIModel, v: any) => setForm(f => ({ ...f, [k]: v }))

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <h2 className="text-lg font-bold">Acces restreint</h2>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          Seuls les administrateurs peuvent gerer les modeles IA.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modèles IA</h1>
          <p className="text-muted-foreground text-sm">Configurez vos providers et modèles OpenAI / DeepSeek / etc.</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" /> Nouveau modèle
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Bot className="h-10 w-10 text-muted" />
            <p className="text-muted-foreground">Aucun modèle configuré.</p>
            {isAdmin && (
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter le premier
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {models.map(m => (
            <Card key={m.id} className={!m.is_active ? "opacity-60" : ""}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{m.name}</span>
                    <Badge variant="outline" className="text-xs">{m.provider}</Badge>
                    {m.is_default && <Badge className="bg-primary text-primary-foreground text-xs">Par défaut</Badge>}
                    {!m.is_active && <Badge variant="secondary" className="text-xs">Inactif</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {m.model_name} • {m.endpoint}
                  </p>
                  {m.description && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">{m.description}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex w-full gap-2 shrink-0 sm:w-auto">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDelete(m)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog create / edit */}
      {dialog && dialog.mode !== "delete" && (
        <Dialog open onOpenChange={o => !o && setDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{dialog.mode === "create" ? "Nouveau modèle" : "Modifier le modèle"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nom</Label>
                  <Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="ex: DeepSeek V3" />
                </div>
                <div className="space-y-1">
                  <Label>Provider</Label>
                  <select
                    value={form.provider}
                    onChange={e => setField("provider", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Endpoint</Label>
                <Input value={form.endpoint} onChange={e => setField("endpoint", e.target.value)} placeholder="https://api.deepseek.com" />
              </div>
              <div className="space-y-1">
                <Label>Nom du modèle</Label>
                <Input value={form.model_name} onChange={e => setField("model_name", e.target.value)} placeholder="deepseek-chat" />
              </div>
              <div className="space-y-1">
                <Label>Clé API</Label>
                <Input type="password" value={form.api_key} onChange={e => setField("api_key", e.target.value)} placeholder="sk-…" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Optionnel" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Temperature</Label>
                  <Input type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={e => setField("temperature", parseFloat(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Max tokens</Label>
                  <Input type="number" min="1" value={form.max_tokens} onChange={e => setField("max_tokens", parseInt(e.target.value))} />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_default} onChange={e => setField("is_default", e.target.checked)} className="rounded border-gray-300" />
                  Par défaut
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setField("is_active", e.target.checked)} className="rounded border-gray-300" />
                  Actif
                </label>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setDialog(null)} className="w-full sm:w-auto"><X className="h-4 w-4 mr-1" /> Annuler</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.model_name} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                {dialog.mode === "create" ? "Créer" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog delete */}
      {dialog && dialog.mode === "delete" && dialog.model && (
        <Dialog open onOpenChange={o => !o && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer {dialog.model.name} ?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">Cette action est irréversible.</p>
            <DialogFooter className="gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setDialog(null)} className="w-full sm:w-auto">Annuler</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
