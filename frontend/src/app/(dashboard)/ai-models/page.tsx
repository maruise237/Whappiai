"use client"

import * as React from "react"
import { 
  Bot, 
  Plus, 
  Pencil, 
  Trash2, 
  Settings2, 
  Globe, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Zap,
  ShieldCheck
} from "lucide-react"

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { TableSkeleton } from "@/components/dashboard/dashboard-skeleton"
import MySwal, { showConfirm, showLoading, showAlert } from "@/lib/swal"
import confetti from "canvas-confetti"
import { usePristine } from "@/hooks/use-pristine"
import { useUser, useAuth } from "@clerk/nextjs"

interface AIModelData {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  model_name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export default function AIModelsPage() {
  const [models, setModels] = React.useState<AIModelData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAddingModel, setIsAddingModel] = React.useState(false)
  const [editingModel, setEditingModel] = React.useState<AIModelData | null>(null)
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

  const { formRef, validate } = usePristine()

  const fetchModels = async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      console.log("Fetching AI models with token:", token ? "Token present" : "No token")
      const data = await api.ai.admin.list(token || undefined)
      setModels(data || [])
    } catch (error) {
      console.error("Failed to fetch AI models:", error)
      toast.error("Erreur lors du chargement des modèles")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress
      let role = (user.publicMetadata?.role as string) || "user"
      
      if (email && email.toLowerCase() === 'maruise237@gmail.com') {
        role = 'admin'
      }
      
      setUserRole(role)
      if (role === 'admin') {
        fetchModels()
      } else {
        toast.error("Accès refusé")
      }
    }
  }, [isLoaded, user])

  const handleAddModel = async () => {
    if (!validate()) return

    try {
      const token = await getToken()
      await api.ai.admin.create(formData, token || undefined)
      toast.success("Modèle d'IA créé avec succès")
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#d8b4fe', '#ffffff']
      })
      setIsAddingModel(false)
      resetForm()
      fetchModels()
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du modèle")
    }
  }

  const handleUpdateModel = async () => {
    if (!editingModel) return
    try {
      const token = await getToken()
      await api.ai.admin.update(editingModel.id, formData, token || undefined)
      toast.success("Modèle d'IA mis à jour avec succès")
      setEditingModel(null)
      resetForm()
      fetchModels()
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour du modèle")
    }
  }

  const handleDeleteModel = async (id: string, name: string) => {
    const result = await showConfirm(
      "Supprimer le modèle ?",
      `Voulez-vous vraiment supprimer le modèle "${name}" ? Cette action est irréversible.`,
      "warning"
    )
    if (!result.isConfirmed) return
    
    const loadingAlert = showLoading("Suppression du modèle...")
    try {
      const token = await getToken()
      await api.ai.admin.delete(id, token || undefined)
      MySwal.close()
      showAlert("Supprimé", "Le modèle a été supprimé avec succès.", "success")
      fetchModels()
    } catch (error: any) {
      MySwal.close()
      showAlert("Erreur", error.message || "Impossible de supprimer le modèle", "error")
    }
  }

  const resetForm = () => {
    setFormData({
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
  }

  const openEdit = (model: AIModelData) => {
    setEditingModel(model)
    setFormData({
      name: model.name,
      provider: model.provider,
      endpoint: model.endpoint,
      api_key: "", // Don't show existing key for security
      model_name: model.model_name,
      description: model.description || "",
      is_active: !!model.is_active,
      is_default: !!model.is_default,
      temperature: model.temperature,
      max_tokens: model.max_tokens
    })
  }

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai': return <Zap className="w-4 h-4 text-emerald-500" />;
      case 'deepseek': return <Activity className="w-4 h-4 text-blue-500" />;
      case 'anthropic': return <ShieldCheck className="w-4 h-4 text-orange-500" />;
      default: return <Globe className="w-4 h-4 text-slate-400" />;
    }
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-6 bg-red-500/10 rounded-full">
          <Lock className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-widest text-red-500">Accès Refusé</h1>
        <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Seuls les administrateurs peuvent accéder à cette page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/30 backdrop-blur-2xl p-10 rounded-lg border-2 border-primary/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg shadow-inner group-hover:scale-110 transition-transform duration-200">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase">
                Modèles d'IA Globaux
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-lg border-2 bg-background/50 border-muted/50 shadow-sm">
                  {models.length} MODÈLES CONFIGURÉS
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">
            Configurez les modèles d'IA disponibles pour vos utilisateurs.
          </p>
        </div>
        
        <Dialog open={isAddingModel} onOpenChange={(open) => {
          setIsAddingModel(open)
          if (open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="h-14 px-10 font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 rounded-lg text-[10px] gap-3 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] border-2 border-primary/20 relative z-10">
              <Plus className="w-5 h-5" />
              Nouveau Modèle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto border-2 rounded-lg p-0 gap-0 bg-background/95 backdrop-blur-xl shadow-2xl">
            <form ref={formRef} className="flex flex-col h-full" onSubmit={(e) => { e.preventDefault(); handleAddModel(); }}>
              <div className="p-10 pb-6">
                <DialogHeader>
                  <div className="flex items-center gap-5 mb-4">
                    <div className="p-4 bg-primary/10 rounded-lg shadow-inner">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1 text-left">
                      <DialogTitle className="text-2xl font-black tracking-tight uppercase">Nouveau Modèle d'IA</DialogTitle>
                      <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                        Ajoutez un fournisseur d'IA global pour tous les utilisateurs.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2 pb-4 border-b border-muted/50">
                  <div className="col-span-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Configuration Rapide</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button"
                    className="h-10 text-[9px] font-black uppercase tracking-widest border-blue-500/20 bg-blue-500/5 text-blue-500 hover:bg-blue-500/10"
                    onClick={() => setFormData({
                      ...formData,
                      name: "Whappi AI",
                      provider: "deepseek",
                      endpoint: "https://api.deepseek.com/v1/chat/completions",
                      model_name: "deepseek-chat",
                      description: "Modèle DeepSeek haute performance (Recommandé)"
                    })}
                  >
                    <Activity className="w-3 h-3 mr-2" /> DeepSeek (Whappi)
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button"
                    className="h-10 text-[9px] font-black uppercase tracking-widest border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => setFormData({
                      ...formData,
                      name: "GPT-4o",
                      provider: "openai",
                      endpoint: "https://api.openai.com/v1/chat/completions",
                      model_name: "gpt-4o",
                      description: "Modèle OpenAI GPT-4o"
                    })}
                  >
                    <Zap className="w-3 h-3 mr-2" /> OpenAI GPT-4o
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                  {/* Model Name */}
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Nom du Modèle (Affichage)</Label>
                    <Input 
                      placeholder="ex: DeepSeek V3 (Standard)" 
                      className="h-14 border-2 rounded-lg font-black bg-background"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>

                  {/* Provider */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Fournisseur</Label>
                    <Select value={formData.provider} onValueChange={(v) => setFormData({...formData, provider: v})}>
                      <SelectTrigger className="h-14 border-2 rounded-lg font-black">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="groq">Groq</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="other">Autre (OpenAI Compatible)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model ID (API) */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">ID Modèle (API)</Label>
                    <Input 
                      placeholder="ex: deepseek-chat" 
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.model_name}
                      onChange={(e) => setFormData({...formData, model_name: e.target.value})}
                      required
                    />
                  </div>

                  {/* Endpoint */}
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Endpoint API</Label>
                    <Input 
                      placeholder="https://api.example.com/v1/chat/completions" 
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                      required
                    />
                  </div>

                  {/* API Key */}
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Clé API</Label>
                    <Input 
                      type="password"
                      placeholder="sk-..." 
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.api_key}
                      onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                      required
                    />
                  </div>

                  {/* Temperature & Max Tokens */}
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Température ({formData.temperature})</Label>
                    <Input 
                      type="number" 
                      step="0.1" min="0" max="2"
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.temperature}
                      onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Max Tokens</Label>
                    <Input 
                      type="number"
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value)})}
                    />
                  </div>

                  {/* Options */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Actif</Label>
                    </div>
                    <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Par Défaut</Label>
                    </div>
                    <Switch checked={formData.is_default} onCheckedChange={(c) => setFormData({...formData, is_default: c})} />
                  </div>
                </div>
              </div>
              
              <DialogFooter className="p-10 border-t border-muted/20 bg-muted/5 flex flex-col sm:flex-row gap-4">
                <Button type="button" variant="ghost" onClick={() => setIsAddingModel(false)} className="h-14 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px]">Annuler</Button>
                <Button type="submit" className="h-14 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px]">Créer le Modèle</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Models Table */}
      <Card className="border-2 border-primary/5 shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2 border-primary/5 h-20">
                    <TableHead className="w-[300px] pl-10 text-[10px] font-black uppercase tracking-[0.2em]">Modèle</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Fournisseur</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Modèle API</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Statut</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Défaut</TableHead>
                    <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-[0.2em]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                          <Bot className="w-16 h-16" />
                          <p className="font-black uppercase tracking-[0.2em] text-[10px]">Aucun modèle d'IA configuré</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    models.map((model) => (
                      <TableRow key={model.id} className="group h-24 hover:bg-primary/[0.02] border-b border-primary/5 transition-colors duration-200">
                        <TableCell className="pl-10">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/5 rounded-lg group-hover:bg-primary/10 transition-colors">
                              <Bot className="w-5 h-5 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-black text-sm uppercase tracking-tight">{model.name}</p>
                              <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px]">{model.endpoint}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getProviderIcon(model.provider)}
                            <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest px-2">{model.provider}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded border border-muted/50">{model.model_name}</code>
                        </TableCell>
                        <TableCell>
                          {model.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black text-[9px] uppercase tracking-widest gap-1.5 px-3 py-1">
                              <CheckCircle2 className="w-3 h-3" /> Actif
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 font-black text-[9px] uppercase tracking-widest gap-1.5 px-3 py-1">
                              <AlertCircle className="w-3 h-3" /> Inactif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {model.is_default && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest px-3 py-1">
                              Défaut
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-10">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(model)} className="h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-lg transition-all">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteModel(model.id, model.name)} className="h-10 w-10 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto border-2 rounded-lg p-0 gap-0 bg-background/95 backdrop-blur-xl shadow-2xl">
          {editingModel && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateModel(); }}>
              <div className="p-10 pb-6">
                <DialogHeader>
                  <div className="flex items-center gap-5 mb-4">
                    <div className="p-4 bg-primary/10 rounded-lg shadow-inner">
                      <Pencil className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1 text-left">
                      <DialogTitle className="text-2xl font-black tracking-tight uppercase">Modifier le Modèle</DialogTitle>
                      <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                        Mise à jour de {editingModel.name}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Nom du Modèle</Label>
                    <Input 
                      className="h-14 border-2 rounded-lg font-black bg-background"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Fournisseur</Label>
                    <Select value={formData.provider} onValueChange={(v) => setFormData({...formData, provider: v})}>
                      <SelectTrigger className="h-14 border-2 rounded-lg font-black">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="groq">Groq</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        <SelectItem value="other">Autre (OpenAI Compatible)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">ID Modèle (API)</Label>
                    <Input 
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.model_name}
                      onChange={(e) => setFormData({...formData, model_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Endpoint API</Label>
                    <Input 
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Clé API (Laisser vide pour conserver)</Label>
                    <Input 
                      type="password"
                      placeholder="••••••••••••••••" 
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.api_key}
                      onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Température</Label>
                    <Input 
                      type="number" step="0.1"
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.temperature}
                      onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Max Tokens</Label>
                    <Input 
                      type="number"
                      className="h-14 border-2 rounded-lg font-black"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/10">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Actif</Label>
                    <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/10">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Par Défaut</Label>
                    <Switch checked={formData.is_default} onCheckedChange={(c) => setFormData({...formData, is_default: c})} />
                  </div>
                </div>
              </div>
              <DialogFooter className="p-10 border-t border-muted/20 bg-muted/5 flex flex-col sm:flex-row gap-4">
                <Button type="button" variant="ghost" onClick={() => setEditingModel(null)} className="h-14 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px]">Annuler</Button>
                <Button type="submit" className="h-14 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px]">Enregistrer</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
