"use client"

import * as React from "react"
import { Bot, Plus, Pencil, Trash2, Globe, Zap, Activity, ShieldCheck, Lock } from "lucide-react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useUser, useAuth } from "@clerk/nextjs"
import { showConfirm } from "@/lib/swal"

export default function AIModelsPage() {
  const [models, setModels] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAddingModel, setIsAddingModel] = React.useState(false)
  const [editingModel, setEditingModel] = React.useState<any>(null)
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  const [formData, setFormData] = React.useState({
    name: "",
    provider: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    api_key: "",
    model_name: "deepseek-chat",
    description: "",
    is_active: true,
    is_default: false,
    temperature: 0.7,
    max_tokens: 2000
  })

  const fetchModels = async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.ai.admin.list(token || undefined)
      setModels(data || [])
    } catch (error) {
      toast.error("Échec du chargement des modèles")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress
      let role = (user.publicMetadata?.role as string) || "user"
      if (email?.toLowerCase() === 'maruise237@gmail.com') role = 'admin'
      setUserRole(role)
      if (role === 'admin') fetchModels()
    }
  }, [isLoaded, user])

  const handleSaveModel = async () => {
    try {
      const token = await getToken()
      if (editingModel) {
        await api.ai.admin.update(editingModel.id, formData, token || undefined)
        toast.success("Modèle mis à jour")
      } else {
        await api.ai.admin.create(formData, token || undefined)
        toast.success("Modèle créé")
      }
      setIsAddingModel(false)
      setEditingModel(null)
      fetchModels()
    } catch (error: any) {
      toast.error(error.message || "Échec de l'enregistrement")
    }
  }

  const handleDeleteModel = async (id: string, name: string) => {
    const res = await showConfirm("Supprimer le modèle ?", `Voulez-vous vraiment supprimer "${name}" ?`, "warning")
    if (!res.isConfirmed) return
    try {
      const token = await getToken()
      await api.ai.admin.delete(id, token || undefined)
      toast.success("Modèle supprimé")
      fetchModels()
    } catch (error: any) {
      toast.error("Échec de la suppression")
    }
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h1 className="text-xl font-semibold">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">Privilèges d&apos;administrateur requis.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Modèles IA</h1>
          <p className="text-sm text-muted-foreground">Gérez les fournisseurs et les modèles IA globaux.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingModel(null); setIsAddingModel(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter un modèle
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium text-muted-foreground">Modèle & Endpoint</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Fournisseur</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Code API</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Statut</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs">Chargement des modèles...</TableCell></TableRow>
            ) : models.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">Aucun modèle configuré.</TableCell></TableRow>
            ) : (
              models.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{m.endpoint}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] uppercase">{m.provider}</Badge>
                  </TableCell>
                  <TableCell><code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{m.model_name}</code></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={m.is_active ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : "bg-muted text-muted-foreground"}>
                        {m.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      {m.is_default && <Badge variant="outline" className="text-[10px]">Défaut</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingModel(m); setFormData({ ...m, api_key: "" }); setIsAddingModel(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteModel(m.id, m.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      <Dialog open={isAddingModel} onOpenChange={setIsAddingModel}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Modifier le modèle" : "Ajouter un modèle"}</DialogTitle>
            <DialogDescription>Configurez les paramètres du modèle IA global.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {!editingModel && (
              <div className="col-span-2 flex gap-2 mb-2">
                <Button size="xs" variant="outline" className="text-[10px]" onClick={() => setFormData({ ...formData, name: "DeepSeek Chat", provider: "deepseek", model_name: "deepseek-chat", endpoint: "https://api.deepseek.com/v1/chat/completions" })}>DeepSeek</Button>
                <Button size="xs" variant="outline" className="text-[10px]" onClick={() => setFormData({ ...formData, name: "GPT-4o", provider: "openai", model_name: "gpt-4o", endpoint: "https://api.openai.com/v1/chat/completions" })}>OpenAI</Button>
              </div>
            )}
            <div className="col-span-2 space-y-2">
              <Label className="text-xs uppercase">Nom d&apos;affichage</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase">Fournisseur</Label>
              <Select value={formData.provider} onValueChange={v => setFormData({ ...formData, provider: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase">Nom API du modèle</Label>
              <Input value={formData.model_name} onChange={e => setFormData({ ...formData, model_name: e.target.value })} className="h-9" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs uppercase">Endpoint API</Label>
              <Input value={formData.endpoint} onChange={e => setFormData({ ...formData, endpoint: e.target.value })} className="h-9" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs uppercase">Clé API</Label>
              <Input type="password" value={formData.api_key} onChange={e => setFormData({ ...formData, api_key: e.target.value })} className="h-9" placeholder={editingModel ? "Laisser vide pour conserver l&apos;actuelle" : "sk-..."} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <Label className="text-xs">Actif</Label>
              <Switch checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <Label className="text-xs">Par défaut</Label>
              <Switch checked={formData.is_default} onCheckedChange={c => setFormData({ ...formData, is_default: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddingModel(false)}>Annuler</Button>
            <Button onClick={handleSaveModel}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
