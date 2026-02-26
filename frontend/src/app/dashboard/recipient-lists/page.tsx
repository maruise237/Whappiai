"use client"

import * as React from "react"
import {
  Plus,
  Search,
  FileSpreadsheet,
  MoreVertical,
  UserPlus,
  Upload,
  Trash2,
  Users,
  Calendar,
  Loader2,
  FileText,
  MessageSquare
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
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
import { cn } from "@/lib/utils"

export default function RecipientListsPage() {
  const { getToken } = useAuth()
  const [lists, setLists] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)

  const fetchLists = React.useCallback(async () => {
    setLoading(true)
    try {
      // Mocking for now since Recipient Management was removed from backend
      // but the UI requires it according to the "2026 prompt"
      setLists([
        { id: '1', name: 'Prospects Immobilier', count: 142, created_at: new Date().toISOString() },
        { id: '2', name: 'Clients VIP 2024', count: 58, created_at: new Date().toISOString() },
        { id: '3', name: 'Leads Landing Page', count: 321, created_at: new Date().toISOString() }
      ])
    } catch (e) {
      toast.error("Erreur de chargement des listes")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchLists()
  }, [fetchLists])

  const filtered = lists.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Listes de Diffusion
          </h1>
          <p className="text-sm text-muted-foreground">Gérez vos bases de contacts pour les envois groupés.</p>
        </div>

        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="rounded-full h-8 px-4">
          <Plus className="h-3 w-3 mr-2" /> Nouvelle Liste
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une liste..."
            className="pl-8 h-9 text-xs bg-muted/20 border-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="h-9 px-3 rounded-md text-[10px] font-semibold tracking-wider text-muted-foreground border-dashed">
          {filtered.length} Listes actives
        </Badge>
      </div>

      <Card className="border-none shadow-none bg-muted/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-muted/30">
              <TableHead className="text-[10px] font-semibold text-muted-foreground">Nom de la liste</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground text-center">Contacts</TableHead>
              <TableHead className="text-[10px] font-semibold text-muted-foreground">Création</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell colSpan={4} className="h-14 bg-muted/5"></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs italic">
                  Aucune liste de contacts trouvée.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id} className="border-muted/20 hover:bg-muted/30 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold">{l.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-[10px] font-bold bg-background border px-2">
                       {l.count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(l.created_at).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem className="text-xs"><UserPlus className="h-3.5 w-3.5 mr-2" /> Ajouter un contact</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs"><Upload className="h-3.5 w-3.5 mr-2" /> Importer CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer la liste</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Nouvelle Liste</DialogTitle>
            <DialogDescription className="text-xs">Nommez votre base de contacts pour vos futures campagnes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground">Nom de la liste</Label>
              <Input placeholder="ex: Prospects Networking 2024" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button size="sm">Créer la liste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
