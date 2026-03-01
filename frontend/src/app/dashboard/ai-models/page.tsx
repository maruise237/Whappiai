"use client"

import * as React from "react"
import {
  Bot,
  Plus,
  Settings2,
  Globe,
  Key,
  CheckCircle2,
  Trash2,
  Edit,
  MoreVertical,
  Loader2,
  Cpu,
  Zap,
  Star,
  TrendingUp
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AiModelsPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [models, setModels] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState<any>(null)
  const [formData, setFormData] = React.useState({
    name: '',
    provider: 'openai',
    endpoint: '',
    model_name: '',
    api_key: '',
    is_default: false
  })

  const [adminStats, setAdminStats] = React.useState<any>(null)

  const fetchModels = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const [modelsData, statsData] = await Promise.all([
        api.ai.admin.list(token || undefined),
        api.admin.getStats(7, token || undefined)
      ])
      setModels(modelsData || [])
      setAdminStats(statsData)
    } catch (e) {
      toast.error("Erreur de chargement des moteurs IA")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchModels().catch(console.error)
  }, [fetchModels])

  const isAdmin = user?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

  const handleSubmit = async () => {
    if (!formData.name || !formData.endpoint || !formData.model_name) {
      return toast.error("Veuillez remplir tous les champs obligatoires")
    }

    try {
      const token = await getToken()
      if (isEditing && selectedModel) {
        await api.ai.admin.update(selectedModel.id, formData, token || undefined)
        toast.success("Modèle mis à jour")
      } else {
        await api.ai.admin.create(formData, token || undefined)
        toast.success("Modèle créé")
      }
      setIsAddOpen(false)
      fetchModels()
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la sauvegarde")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce modèle ?")) return
    try {
      const token = await getToken()
      await api.ai.admin.delete(id, token || undefined)
      toast.success("Modèle supprimé")
      fetchModels()
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la suppression")
    }
  }

  const openAdd = () => {
    setIsEditing(false)
    setSelectedModel(null)
    setFormData({
      name: '',
      provider: 'openai',
      endpoint: '',
      model_name: '',
      api_key: '',
      is_default: false
    })
    setIsAddOpen(true)
  }

  const openEdit = (model: any) => {
    setIsEditing(true)
    setSelectedModel(model)
    setFormData({
      name: model.name,
      provider: model.provider || 'openai',
      endpoint: model.endpoint,
      model_name: model.model_name,
      api_key: '',
      is_default: model.is_default === 1 || model.is_default === true
    })
    setIsAddOpen(true)
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Cpu className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg font-bold">Zone Administrateur</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">La configuration des moteurs LLM est réservée à la maintenance.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> Moteurs LLM (IA)
          </h1>
          <p className="text-sm text-muted-foreground">Configurez les APIs et endpoints pour l&apos;intelligence du bot.</p>
        </div>

        <Button size="sm" onClick={openAdd} className="rounded-full h-8 px-4">
          <Plus className="h-3 w-3 mr-2" /> Ajouter un Modèle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-none bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
             <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Zap className="h-4 w-4" /></div>
             <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Moteur Actif</p>
                <p className="text-sm font-bold">{models.find(m => m.is_default)?.name || "Non défini"}</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-none bg-muted/20">
          <CardContent className="p-4 flex items-center gap-3">
             <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Star className="h-4 w-4" /></div>
             <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Modèles Configurés</p>
                <p className="text-sm font-bold">{models.length}</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-none bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
             <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600"><CheckCircle2 className="h-4 w-4" /></div>
             <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Messages IA Envoyés</p>
                <p className="text-sm font-bold">{adminStats?.overview?.messagesSent || 0}</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-none bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
             <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600"><TrendingUp className="h-4 w-4" /></div>
             <div>
                <p className="text-[10px] font-semibold text-muted-foreground">Taux de Succès Global</p>
                <p className="text-sm font-bold">{adminStats?.overview?.successRate || 0}%</p>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none bg-muted/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-muted/30">
                <TableHead className="text-[10px] font-semibold text-muted-foreground">Modèle</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground hidden sm:table-cell">Provider / API</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground hidden lg:table-cell">Code Technique</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground text-center hidden md:table-cell">Usage (Sent/Recv)</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground text-center">Par Défaut</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={6} className="h-14 bg-muted/5"></TableCell>
                  </TableRow>
                ))
              ) : models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs italic">
                    Aucun moteur configuré.
                  </TableCell>
                </TableRow>
              ) : (
                models.map((m) => {
                  const usage = adminStats?.ai?.find((s: any) => s.model === m.id || s.model === m.model_name);
                  return (
                    <TableRow key={m.id} className="border-muted/20 group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground opacity-60 truncate max-w-[150px]">{m.endpoint || m.api_endpoint}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-[9px] font-semibold bg-background border">
                          {m.provider || 'OpenAI API'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">{m.model_name}</code>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold">{usage?.sent || 0} / {usage?.received || 0}</span>
                            <span className="text-[8px] text-muted-foreground uppercase">Messages</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {m.is_default ? (
                          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-none text-[9px]">DÉFAUT</Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground opacity-30">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                           <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="h-7 w-7 opacity-0 group-hover:opacity-100"><Edit className="h-3.5 w-3.5" /></Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base">{isEditing ? 'Modifier le Moteur LLM' : 'Ajouter un Moteur LLM'}</DialogTitle>
            <DialogDescription className="text-xs">Configurez une nouvelle API compatible OpenAI pour vos bots.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
             <div className="space-y-1.5 col-span-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Nom d&apos;affichage</Label>
                <Input
                  placeholder="GPT-4o ou Claude-3"
                  className="h-9"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
             </div>
             <div className="space-y-1.5 col-span-2">
                <Label className="text-[10px] font-semibold text-muted-foreground">Endpoint API (Base URL)</Label>
                <Input
                  placeholder="https://api.openai.com/v1"
                  className="h-9 font-mono text-[11px]"
                  value={formData.endpoint}
                  onChange={e => setFormData({...formData, endpoint: e.target.value})}
                />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-muted-foreground">Code du Modèle</Label>
                <Input
                  placeholder="gpt-4o"
                  className="h-9 font-mono text-[11px]"
                  value={formData.model_name}
                  onChange={e => setFormData({...formData, model_name: e.target.value})}
                />
             </div>
             <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-muted-foreground">Clé API (Secret)</Label>
                <Input
                  type="password"
                  placeholder={isEditing ? "(Inchangé)" : "sk-..."}
                  className="h-9 font-mono text-[11px]"
                  value={formData.api_key}
                  onChange={e => setFormData({...formData, api_key: e.target.value})}
                />
             </div>
             <div className="flex items-center justify-between col-span-2 p-3 bg-muted/20 rounded-md mt-2">
                <div className="space-y-0.5">
                   <p className="text-xs font-bold">Modèle par défaut</p>
                   <p className="text-[10px] text-muted-foreground">Utiliser ce moteur pour tous les nouveaux bots.</p>
                </div>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={checked => setFormData({...formData, is_default: checked})}
                />
             </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button size="sm" onClick={handleSubmit} className="w-full sm:w-auto">Sauvegarder le Moteur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
