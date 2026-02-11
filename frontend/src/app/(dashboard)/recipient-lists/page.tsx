"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  MoreHorizontal,
  FileSpreadsheet,
  UserPlus,
  ArrowLeft,
  CircleCheck,
  CircleX
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { TableSkeleton } from "@/components/dashboard/dashboard-skeleton"
import confetti from "canvas-confetti"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RecipientList {
  id: string;
  name: string;
  count: number;
  createdAt: string;
}

import { Badge } from "@/components/ui/badge"
import { usePristine } from "@/hooks/use-pristine"

export default function RecipientListsPage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [lists, setLists] = React.useState<RecipientList[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isAddRecipientOpen, setIsAddRecipientOpen] = React.useState(false)
  const [selectedListId, setSelectedListId] = React.useState<string | null>(null)
  const [newRecipient, setNewRecipient] = React.useState({ number: "", name: "" })

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [createListName, setCreateListName] = React.useState("")
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false)
  const [importListId, setImportListId] = React.useState<string | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)
  const [listToDelete, setListToDelete] = React.useState<string | null>(null)

  const { formRef, validate } = usePristine()

  const fetchLists = async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.recipientLists.list(token || undefined)
      setLists(data || [])
    } catch (error) {
      console.error("Failed to fetch recipient lists:", error)
      toast.error("Échec du chargement des listes")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchLists()
  }, [])

  const handleCreate = () => {
    setIsCreateDialogOpen(true)
  }

  const processCreate = async () => {
    if (!createListName) return toast.error("Le nom est requis")
    try {
      const token = await getToken()
      await api.recipientLists.create({ name: createListName, recipients: [] }, token || undefined)
      toast.success("Liste créée avec succès")
      setIsCreateDialogOpen(false)
      setCreateListName("")
      fetchLists()
    } catch (error) {
      toast.error("Échec de la création")
    }
  }

  const handleImportCSV = (listId: string) => {
    setImportListId(listId)
    setIsImportDialogOpen(true)
  }

  const processImport = async (file: File) => {
    if (!importListId || !file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      try {
        const token = await getToken()
        const lines = text.split('\n')
        const recipients = lines.slice(1).filter(line => line.trim()).map(line => {
          const [number, name] = line.split(',')
          return { number: number?.trim(), name: name?.trim() }
        }).filter(r => r.number)

        for (const recipient of recipients) {
          await api.recipientLists.addRecipient(importListId, recipient, token || undefined)
        }
        
        toast.success(`${recipients.length} contacts importés`)
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff']
        })
        setIsImportDialogOpen(false)
        setImportListId(null)
        fetchLists()
      } catch (error) {
        toast.error("Échec de l'importation")
      }
    }
    reader.readAsText(file)
  }

  const handleDelete = (id: string) => {
    setListToDelete(id)
    setIsDeleteConfirmOpen(true)
  }

  const handleManualAdd = async () => {
    if (!selectedListId) return
    
    if (!validate()) return

    try {
      const token = await getToken()
      await api.recipientLists.addRecipient(selectedListId, newRecipient, token || undefined)
      toast.success("Contact ajouté")
      setIsAddRecipientOpen(false)
      setNewRecipient({ number: "", name: "" })
      fetchLists()
    } catch (error) {
      toast.error("Échec de l'ajout")
    }
  }

  const processDelete = async () => {
    if (!listToDelete) return
    try {
      const token = await getToken()
      await api.recipientLists.delete(listToDelete, token || undefined)
      toast.success("Liste supprimée")
      setIsDeleteConfirmOpen(false)
      setListToDelete(null)
      fetchLists()
    } catch (error) {
      toast.error("Échec de la suppression")
    }
  }

  const filteredLists = lists.filter(list => 
    list.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-card p-6 sm:p-8 border border-slate-200 dark:border-primary/10 rounded-lg shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 shadow-sm group-hover:scale-110 transition-transform duration-200">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary leading-none uppercase">
                Listes
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest border-primary/20 bg-primary/5 text-primary px-3 py-1 rounded-lg">
                  {lists.length} TOTAL
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium max-w-md">
            Gérez vos groupes de destinataires pour vos campagnes de diffusion.
          </p>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <Button 
            variant="outline" 
            onClick={() => router.back()} 
            className="gap-2 h-12 px-6 rounded-lg border-slate-200 dark:border-primary/20 hover:bg-primary/5 transition-all duration-200 font-bold uppercase tracking-widest text-[11px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <Button 
            onClick={handleCreate} 
            className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all duration-200 active:scale-95 rounded-lg font-bold uppercase tracking-widest text-[11px] px-6 h-12"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Liste
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher une liste..." 
            className="pl-9 h-12 bg-white dark:bg-card border-slate-200 dark:border-primary/10 focus:border-primary/30 transition-all duration-200 rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl overflow-hidden bg-white dark:bg-card">
        <CardHeader className="bg-slate-50 dark:bg-primary/5 border-b border-slate-100 dark:border-primary/5 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold uppercase tracking-tight">Toutes les listes</CardTitle>
                <CardDescription className="font-semibold text-[10px] uppercase tracking-widest opacity-60">
                  Listes importées via CSV ou créées manuellement.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 animate-spin text-primary rounded-full border-2 border-current border-t-transparent" />
              <p className="text-muted-foreground font-semibold animate-pulse uppercase tracking-widest text-[10px]">Chargement des listes...</p>
            </div>
          ) : filteredLists.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 dark:bg-card/10">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
              <h3 className="text-xl font-bold text-muted-foreground uppercase">Aucune liste trouvée</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-2 text-sm font-medium">
                Commencez par créer votre première liste de contacts ou importez un fichier CSV.
              </p>
              <Button variant="outline" className="mt-6 gap-2 rounded-lg font-bold uppercase tracking-widest text-[11px]" onClick={handleCreate}>
                <Plus className="w-4 h-4" /> Créer une liste
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-primary/[0.02]">
                  <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-primary/5">
                    <TableHead className="font-bold uppercase tracking-widest text-[10px] py-5 pl-8">Nom de la Liste</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px] py-5">Contacts</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px] py-5 hidden md:table-cell">Création</TableHead>
                    <TableHead className="font-bold uppercase tracking-widest text-[10px] py-5 text-right pr-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLists.map((list) => (
                    <TableRow key={list.id} className="group hover:bg-slate-50 dark:hover:bg-primary/[0.03] transition-colors duration-200 border-b border-slate-50 dark:border-primary/5 last:border-0">
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-base group-hover:text-primary transition-colors duration-200">{list.name}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest opacity-70">ID: {list.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-widest">
                          {list.count} CONTACTS
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 font-semibold text-[10px] uppercase tracking-widest text-muted-foreground/70 hidden md:table-cell">
                        {new Date(list.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="py-5 text-right pr-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-primary/10 transition-colors duration-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl">
                            <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest opacity-60">Options Liste</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-lg font-semibold text-sm" onClick={() => {
                              setSelectedListId(list.id);
                              setIsAddRecipientOpen(true);
                            }}>
                              <UserPlus className="w-4 h-4 mr-2" /> Ajouter un contact
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-semibold text-sm" onClick={() => handleImportCSV(list.id)}>
                              <Plus className="w-4 h-4 mr-2 text-emerald-600" /> Importer CSV
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-lg font-semibold text-sm text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(list.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Supprimer la liste
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl p-0 gap-0 bg-white dark:bg-card/95 backdrop-blur-sm">
          <DialogHeader className="p-6 sm:p-8 pb-2">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight text-primary">Ajouter un Contact</DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Remplissez les informations ci-dessous.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form ref={formRef} className="space-y-6 p-6 sm:p-8 pt-2" onSubmit={(e) => { e.preventDefault(); handleManualAdd(); }}>
            <div className="space-y-2">
              <Label htmlFor="number" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Numéro de téléphone</Label>
              <Input 
                id="number"
                name="number"
                placeholder="ex: 2250102030405" 
                className="h-11 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus:border-primary/30 transition-all duration-200"
                value={newRecipient.number}
                onChange={(e) => setNewRecipient({...newRecipient, number: e.target.value})}
                required
                data-pristine-required-message="Le numéro est requis"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nom (Optionnel)</Label>
              <Input 
                id="name"
                name="name"
                placeholder="ex: Jean Dupont" 
                className="h-11 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus:border-primary/30 transition-all duration-200"
                value={newRecipient.name}
                onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})}
              />
            </div>
            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddRecipientOpen(false)} className="rounded-lg font-semibold h-11 px-6">Annuler</Button>
              <Button type="submit" className="rounded-lg font-bold h-11 px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all duration-200">Ajouter le contact</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl p-0 gap-0 bg-white dark:bg-card/95 backdrop-blur-sm">
          <DialogHeader className="p-6 sm:p-8 pb-2">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight text-primary">Nouvelle Liste</DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Créez un nouveau groupe de contacts.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 sm:p-8 pt-2 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nom de la liste</Label>
              <Input 
                placeholder="ex: Clients VIP 2026"
                className="h-11 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus:border-primary/30 transition-all duration-200"
                value={createListName}
                onChange={(e) => setCreateListName(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="rounded-lg font-semibold h-11 px-6">Annuler</Button>
              <Button onClick={processCreate} className="rounded-lg font-bold h-11 px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all duration-200">Créer la liste</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl p-0 gap-0 bg-white dark:bg-card/95 backdrop-blur-sm">
          <DialogHeader className="p-6 sm:p-8 pb-2">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight text-primary">Importer CSV</DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Sélectionnez votre fichier contacts (.csv).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 sm:p-8 pt-2 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Fichier CSV</Label>
              <Input 
                type="file"
                accept=".csv"
                className="h-11 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus:border-primary/30 transition-all duration-200 p-2"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) processImport(file)
                }}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)} className="w-full rounded-lg font-semibold h-11 transition-all duration-200">Annuler</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] w-[95vw] rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl p-6 bg-white dark:bg-card/95 backdrop-blur-sm transition-all duration-200">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold uppercase tracking-tight">Supprimer la liste ?</DialogTitle>
              <DialogDescription className="text-sm font-medium opacity-70">
                Cette action est irréversible et supprimera tous les contacts.
              </DialogDescription>
            </div>
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="rounded-lg font-semibold h-11 px-6 transition-all duration-200">Annuler</Button>
            <Button variant="destructive" onClick={processDelete} className="rounded-lg font-bold h-11 px-8 shadow-lg shadow-destructive/20 transition-all duration-200">Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
