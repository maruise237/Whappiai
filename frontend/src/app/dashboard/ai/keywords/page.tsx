"use client"

import * as React from "react"
import {
  Plus,
  Trash2,
  Search,
  MessageSquare,
  Settings2,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  ExternalLink,
  ChevronLeft,
  Zap,
  MoreVertical,
  Edit,
  Save,
  Upload,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import confetti from "canvas-confetti"

export default function KeywordsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [sessions, setSessions] = React.useState<any[]>([])
  const [selectedSession, setSelectedSession] = React.useState<string>("")
  const [keywords, setKeywords] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<any>(null)

  const [formData, setFormData] = React.useState({
    keyword: "",
    match_type: "contains",
    response_type: "text",
    response_content: "",
    file_name: "",
    is_active: 1
  })

  const fetchSessions = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
      if (data && data.length > 0 && !selectedSession) {
        setSelectedSession(data[0].sessionId)
      }
    } catch (error) {
      console.error("Failed to fetch sessions", error)
    }
  }, [getToken, selectedSession])

  const fetchKeywords = React.useCallback(async () => {
    if (!selectedSession) return
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getKeywords(selectedSession, token || undefined)
      setKeywords(data || [])
    } catch (error) {
      toast.error("Échec du chargement des règles")
    } finally {
      setLoading(false)
    }
  }, [getToken, selectedSession])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  React.useEffect(() => {
    if (selectedSession) {
      fetchKeywords()
    }
  }, [fetchKeywords, selectedSession])

  const handleCreateOrUpdate = async () => {
    if (!formData.keyword || !formData.response_content) {
      return toast.error("Le mot-clé et la réponse sont requis")
    }

    try {
      const token = await getToken()
      if (editingRule) {
        await api.sessions.updateKeyword(selectedSession, editingRule.id, formData, token || undefined)
        toast.success("Règle mise à jour")
      } else {
        await api.sessions.addKeyword(selectedSession, formData, token || undefined)
        toast.success("Règle créée")
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
      setIsDialogOpen(false)
      setEditingRule(null)
      setFormData({
        keyword: "",
        match_type: "contains",
        response_type: "text",
        response_content: "",
        file_name: "",
        is_active: 1
      })
      fetchKeywords()
    } catch (error) {
      toast.error("Échec de l'enregistrement")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken()
      await api.sessions.deleteKeyword(selectedSession, id, token || undefined)
      toast.success("Règle supprimée")
      fetchKeywords()
    } catch (error) {
      toast.error("Échec de la suppression")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const token = await getToken()
      // We use the existing media upload endpoint
      const data = await api.messages.upload(file, token || undefined)
      setFormData({
        ...formData,
        response_content: data.url,
        file_name: file.name
      })
      toast.success("Fichier mis en ligne")
    } catch (error) {
      toast.error("Échec de l'upload")
    } finally {
      setIsUploading(false)
    }
  }

  const openEdit = (rule: any) => {
    setEditingRule(rule)
    setFormData({
      keyword: rule.keyword,
      match_type: rule.match_type,
      response_type: rule.response_type,
      response_content: rule.response_content,
      file_name: rule.file_name || "",
      is_active: rule.is_active
    })
    setIsDialogOpen(true)
  }

  const getResponseIcon = (type: string) => {
    switch (type) {
      case 'text': return <MessageSquare className="h-4 w-4 text-primary" />
      case 'image': return <ImageIcon className="h-4 w-4 text-blue-500" />
      case 'document': return <FileText className="h-4 w-4 text-amber-500" />
      case 'audio': return <Mic className="h-4 w-4 text-purple-500" />
      case 'video': return <Video className="h-4 w-4 text-red-500" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Réponses Automatiques</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1">
              <Zap className="h-3 w-3 fill-primary" /> Économise l&apos;IA
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-10">Configurez des réponses par mots-clés pour économiser vos crédits IA.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(s => (
                <SelectItem key={s.sessionId} value={s.sessionId}>{s.sessionId}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setEditingRule(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nouvelle règle
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Mot-clé</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Type de match</TableHead>
              <TableHead className="text-xs">Réponse</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : keywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Zap className="h-8 w-8 opacity-20 mb-3" />
                    <p className="text-sm">Aucune règle configurée pour cette session</p>
                    <p className="text-xs">Créez votre première réponse automatique par mot-clé.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              keywords.map(rule => (
                <TableRow key={rule.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-sm">{rule.keyword}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {rule.match_type === 'exact' ? 'Exact' : rule.match_type === 'contains' ? 'Contient' : 'Regex'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getResponseIcon(rule.response_type)}
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {rule.response_type === 'text' ? rule.response_content : rule.file_name || 'Fichier média'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active === 1}
                      onCheckedChange={async (v) => {
                        const token = await getToken()
                        await api.sessions.updateKeyword(selectedSession, rule.id, { is_active: v ? 1 : 0 }, token || undefined)
                        fetchKeywords()
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(rule)}><Edit className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Modifier la règle' : 'Nouvelle réponse automatique'}</DialogTitle>
            <DialogDescription>Définissez un mot-clé et la réponse correspondante.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider">Mot-clé</Label>
                <Input
                  placeholder="ex: Tarifs"
                  value={formData.keyword}
                  onChange={e => setFormData({...formData, keyword: e.target.value})}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider">Type de match</Label>
                <Select value={formData.match_type} onValueChange={v => setFormData({...formData, match_type: v})}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exact</SelectItem>
                    <SelectItem value="contains">Contient</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Type de réponse</Label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'text', icon: MessageSquare, label: 'Texte' },
                  { id: 'image', icon: ImageIcon, label: 'Image' },
                  { id: 'document', icon: FileText, label: 'Doc' },
                  { id: 'audio', icon: Mic, label: 'Audio' },
                  { id: 'video', icon: Video, label: 'Vidéo' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setFormData({...formData, response_type: type.id, response_content: ""})}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 border rounded-md transition-colors",
                      formData.response_type === type.id ? "bg-primary/10 border-primary text-primary" : "hover:bg-muted"
                    )}
                  >
                    <type.icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">Contenu de la réponse</Label>
              {formData.response_type === 'text' ? (
                <Textarea
                  placeholder="Votre message automatique..."
                  value={formData.response_content}
                  onChange={e => setFormData({...formData, response_content: e.target.value})}
                  className="min-h-[100px] text-sm"
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="URL du média (https://...)"
                      value={formData.response_content}
                      onChange={e => setFormData({...formData, response_content: e.target.value})}
                      className="h-9 text-sm"
                    />
                    <input
                      type="file"
                      id="keyword-file-up"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept={
                        formData.response_type === 'image' ? 'image/*' :
                        formData.response_type === 'audio' ? 'audio/*' :
                        formData.response_type === 'video' ? 'video/*' :
                        '*'
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      disabled={isUploading}
                      onClick={() => document.getElementById('keyword-file-up')?.click()}
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                  {formData.file_name && (
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50 border border-dashed">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs truncate">{formData.file_name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateOrUpdate}>{editingRule ? 'Enregistrer' : 'Créer la règle'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
