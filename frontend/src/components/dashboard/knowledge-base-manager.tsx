"use client"

import * as React from "react"
import {
  FileText,
  Plus,
  Trash2,
  Globe,
  Book,
  Upload,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"

export function KnowledgeBaseManager({ sessionId }: { sessionId: string }) {
  const { getToken } = useAuth()
  const [docs, setDocs] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAdding, setIsAdding] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: "",
    content: "",
    type: "text",
    source: ""
  })

  const fetchDocs = React.useCallback(async () => {
    try {
      const token = await getToken()
      const response = await api.sessions.getKnowledge(sessionId, token || undefined)
      setDocs(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error("Failed to fetch knowledge base", error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, getToken])

  React.useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleAdd = async () => {
    if (!formData.name || !formData.content) {
      return toast.error("Nom et contenu requis")
    }

    setIsSubmitting(true)
    try {
      const token = await getToken()
      await api.sessions.addKnowledge(sessionId, formData, token || undefined)
      toast.success("Document ajouté")
      setIsAdding(false)
      setFormData({ name: "", content: "", type: "text", source: "" })
      fetchDocs()
    } catch (error: any) {
      toast.error("Erreur lors de l'ajout")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken()
      await api.sessions.deleteKnowledge(sessionId, id, token || undefined)
      toast.success("Document supprimé")
      fetchDocs()
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" /> Base de Connaissances
          </h2>
          <p className="text-sm text-muted-foreground">Ajoutez des informations spécifiques pour que l&apos;IA réponde avec précision.</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (!Array.isArray(docs) || docs.length === 0) ? (
          <div className="col-span-full p-12 text-center border-dashed border-2 rounded-lg bg-muted/20">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun document dans la base de connaissances.</p>
          </div>
        ) : (
          docs.map(doc => (
            <Card key={doc.id} className="relative group">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {doc.type === 'url' ? <Globe className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-primary" />}
                    <span className="text-sm font-medium truncate max-w-[200px]">{doc.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Ajouté le {doc?.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Date inconnue'}
                </p>
                {doc?.source && <p className="text-xs text-blue-500 truncate mt-1">{doc.source}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ajouter à la base de connaissances</DialogTitle>
            <DialogDescription>Copiez-collez du texte ou des informations clés.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase">Nom du document</Label>
              <Input placeholder="ex: Tarifs 2024, FAQ Livraison..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase">Contenu (Texte brut)</Label>
              <Textarea placeholder="Collez ici les informations que l'IA doit connaître..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="min-h-[250px] text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase">Source (Optionnel)</Label>
              <Input placeholder="ex: https://monsite.com/faq" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
