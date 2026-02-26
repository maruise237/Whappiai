"use client"

import * as React from "react"
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  UserPlus,
  Mail,
  Shield,
  Calendar,
  Loader2,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function UsersPage() {
  const { getToken } = useAuth()
  const { user: currentUser } = useUser()
  const [users, setUsers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.users.list(token || undefined)
      setUsers(data || [])
    } catch (e) {
      toast.error("Erreur de chargement des utilisateurs")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.clerk_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isAdmin = currentUser?.primaryEmailAddress?.emailAddress?.toLowerCase() === 'maruise237@gmail.com' ||
                  currentUser?.publicMetadata?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-lg font-bold">Accès Restreint</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">Seuls les administrateurs peuvent gérer les utilisateurs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Gestion Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground">Administrez les accès et rôles de la plateforme.</p>
        </div>

        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="rounded-full h-8 px-4">
          <Plus className="h-3 w-3 mr-2" /> Nouvel Utilisateur
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email ou ID..."
            className="pl-8 h-9 text-xs bg-muted/20 border-none"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="h-9 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-dashed">
          {filtered.length} Utilisateurs au total
        </Badge>
      </div>

      <Card className="border-none shadow-none bg-muted/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-muted/30">
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Utilisateur</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Rôle</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Statut</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Date d&apos;inscription</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-muted/20">
                  <TableCell colSpan={5} className="h-14 bg-muted/5"></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs italic">
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="border-muted/20 hover:bg-muted/30 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">{u.email}</span>
                        <span className="text-[9px] font-mono text-muted-foreground opacity-60 uppercase">{u.clerk_id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn(
                      "text-[9px] uppercase font-bold",
                      u.role === 'admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                    )}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {u.is_active ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-muted-foreground/30" />
                      )}
                      <span className="text-[11px] font-medium">{u.is_active ? 'Actif' : 'Désactivé'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(u.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-xs"><Edit className="h-3.5 w-3.5 mr-2" /> Modifier Rôle</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs"><Shield className="h-3.5 w-3.5 mr-2" /> {u.is_active ? 'Désactiver' : 'Réactiver'}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Ajouter un Utilisateur</DialogTitle>
            <DialogDescription className="text-xs">
              Créez manuellement un accès pour un nouveau membre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Email de l&apos;utilisateur</Label>
              <Input placeholder="user@example.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rôle initial</Label>
              <Select defaultValue="user">
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur Standard</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
            <Button size="sm">Lancer l&apos;invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
