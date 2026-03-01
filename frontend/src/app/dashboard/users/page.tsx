"use client"

import * as React from "react"
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Shield,
  Loader2,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Zap,
  Smartphone,
  History,
  TrendingUp,
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
  } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UsersPage() {
  const { getToken } = useAuth()
  const { user: currentUser } = useUser()
  const [users, setUsers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [userDetails, setUserDetails] = React.useState<any>(null)
  const [isDetailsLoading, setIsDetailsLoading] = React.useState(false)

  const [formData, setFormData] = React.useState({
    email: '',
    role: 'user'
  })

  const [creditForm, setCreditForm] = React.useState({
    amount: 100,
    type: 'bonus',
    description: 'Bonus exceptionnel admin'
  })

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

  const fetchUserDetails = React.useCallback(async (userId: string) => {
    setIsDetailsLoading(true)
    try {
      const token = await getToken()
      const data = await api.admin.getUserDetails(userId, token || undefined)
      setUserDetails(data)
    } catch (e) {
      toast.error("Erreur de chargement des détails")
    } finally {
      setIsDetailsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  React.useEffect(() => {
    if (selectedUserId) {
        fetchUserDetails(selectedUserId)
    } else {
        setUserDetails(null)
    }
  }, [selectedUserId, fetchUserDetails])

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.id && u.id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const isAdmin = currentUser?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || currentUser?.publicMetadata?.role === "admin"

  const handleCreateUser = async () => {
    if (!formData.email) return toast.error("Email requis")
    setIsSubmitting(true)
    try {
      const token = await getToken()
      await api.users.create(formData, token || undefined)
      toast.success("Utilisateur invité/créé")
      setIsAddDialogOpen(false)
      fetchUsers()
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la création")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRole = async (email: string, newRole: string) => {
    try {
      const token = await getToken()
      await api.users.update(email, { role: newRole }, token || undefined)
      toast.success("Rôle mis à jour")
      fetchUsers()
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la mise à jour")
    }
  }

  const handleToggleStatus = async (user: any) => {
    try {
      const token = await getToken()
      await api.users.update(user.email, { is_active: !user.is_active }, token || undefined)
      toast.success(user.is_active ? "Compte désactivé" : "Compte réactivé")
      fetchUsers()
    } catch (e: any) {
      toast.error(e.message || "Erreur de statut")
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Supprimer définitivement cet utilisateur ?")) return
    try {
      const token = await getToken()
      await api.users.delete(id, token || undefined)
      toast.success("Utilisateur supprimé")
      fetchUsers()
    } catch (e: any) {
      toast.error(e.message || "Erreur de suppression")
    }
  }

  const handleAdjustCredits = async () => {
    if (!selectedUserId) return
    setIsSubmitting(true)
    try {
        const token = await getToken()
        await api.admin.adjustCredits(
            selectedUserId,
            creditForm.amount,
            creditForm.type,
            creditForm.description,
            token || undefined
        )
        toast.success("Portefeuille mis à jour")
        fetchUserDetails(selectedUserId)
        fetchUsers()
    } catch (e: any) {
        toast.error(e.message || "Erreur lors de l'ajustement")
    } finally {
        setIsSubmitting(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Gestion Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground">Administrez les accès et les portefeuilles crédits.</p>
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
            onChange={handleSearchChange}
          />
        </div>
        <Badge variant="outline" className="h-9 px-3 rounded-md text-[10px] font-semibold tracking-wider text-muted-foreground border-dashed">
          {filtered.length} Utilisateurs
        </Badge>
      </div>

      <Card className="border-none shadow-none bg-muted/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-muted/30">
                <TableHead className="text-[10px] font-semibold text-muted-foreground">Utilisateur</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground hidden sm:table-cell">Rôle</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground">Crédits</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground hidden md:table-cell">Statut</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={c.id || i} className="animate-pulse border-muted/20">
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
                <TableRow key={u.id || u.email} className="border-muted/20 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => setSelectedUserId(u.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">{u.email}</span>
                        <span className="text-[9px] font-mono text-muted-foreground opacity-60 uppercase">{u.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className={cn(
                      "text-[9px] font-semibold",
                      u.role === 'admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                    )}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 min-w-0">
                        <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span className="text-xs font-bold">{u.message_limit}</span>
                        </div>
                        <Badge variant="secondary" className={cn(
                            "sm:hidden text-[8px] h-3.5 w-fit px-1",
                            u.role === 'admin' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                            {u.role}
                        </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      {u.is_active ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-muted-foreground/30" />
                      )}
                      <span className="text-[11px] font-medium">{u.is_active ? 'Actif' : 'Désactivé'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-xs" onClick={() => setSelectedUserId(u.id)}>
                          <TrendingUp className="h-3.5 w-3.5 mr-2" /> Détails & Crédits
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs" onClick={() => handleUpdateRole(u.email, u.role === 'admin' ? 'user' : 'admin')}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Passer en {u.role === 'admin' ? 'Utilisateur' : 'Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs" onClick={() => handleToggleStatus(u)}>
                          <Shield className="h-3.5 w-3.5 mr-2" /> {u.is_active ? 'Désactiver' : 'Réactiver'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-destructive" onClick={() => handleDeleteUser(u.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      <Sheet open={!!selectedUserId} onOpenChange={open => !open && setSelectedUserId(null)}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {userDetails?.user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                    <p className="text-base font-bold">{userDetails?.user?.email}</p>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest">{userDetails?.user?.role}</Badge>
                </div>
            </SheetTitle>
            <SheetDescription className="text-xs">
                Vision 360° de l&apos;utilisateur : sessions, finances et activités.
            </SheetDescription>
          </SheetHeader>

          {isDetailsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                <p className="text-xs text-muted-foreground italic">Chargement du profil...</p>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="text-[10px] font-bold">Overview</TabsTrigger>
                    <TabsTrigger value="credits" className="text-[10px] font-bold">Portefeuille</TabsTrigger>
                    <TabsTrigger value="activity" className="text-[10px] font-bold">Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-muted/10 border-none shadow-none">
                            <CardContent className="p-3">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Crédits Dispo</p>
                                <div className="text-lg font-bold flex items-center gap-1"><Zap className="h-4 w-4 text-amber-500" /> {userDetails?.user?.message_limit}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-muted/10 border-none shadow-none">
                            <CardContent className="p-3">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Messages Envoyés</p>
                                <div className="text-lg font-bold flex items-center gap-1"><Smartphone className="h-4 w-4 text-primary" /> {userDetails?.user?.message_used}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <Smartphone className="h-3 w-3" /> Sessions Connectées ({userDetails?.sessions?.length || 0})
                        </h4>
                        <div className="space-y-2">
                            {userDetails?.sessions?.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{s.id}</p>
                                        <p className="text-[10px] text-muted-foreground">{s.status}</p>
                                    </div>
                                    <Badge className={cn("text-[9px]", s.status === 'CONNECTED' ? "bg-green-500/10 text-green-600 border-none" : "bg-muted text-muted-foreground border-none")}>
                                        {s.status === 'CONNECTED' ? 'Live' : 'Off'}
                                    </Badge>
                                </div>
                            ))}
                            {(!userDetails?.sessions || userDetails.sessions.length === 0) && (
                                <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/5 rounded-lg border-2 border-dashed">Aucune session active.</p>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="credits" className="space-y-6">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-xs font-bold">Ajustement Manuel</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px]">Montant</Label>
                                    <Input
                                        type="number"
                                        className="h-8"
                                        value={creditForm.amount}
                                        onChange={e => setCreditForm({...creditForm, amount: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px]">Type d&apos;opération</Label>
                                    <Select
                                        value={creditForm.type}
                                        onValueChange={v => setCreditForm({...creditForm, type: v})}
                                    >
                                        <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bonus">Bonus (Offert)</SelectItem>
                                            <SelectItem value="purchase">Achat manuel</SelectItem>
                                            <SelectItem value="credit">Remboursement</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px]">Description (visible par l&apos;utilisateur)</Label>
                                <Input
                                    className="h-8"
                                    placeholder="Ex: Geste commercial..."
                                    value={creditForm.description}
                                    onChange={e => setCreditForm({...creditForm, description: e.target.value})}
                                />
                            </div>
                            <Button size="sm" className="w-full h-8 text-[11px] font-bold" onClick={handleAdjustCredits} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                                Valider l&apos;ajustement
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <History className="h-3 w-3" /> Historique Financier
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableBody>
                                    {userDetails?.credits?.map((c: any) => (
                                        <TableRow key={c.id} className="hover:bg-muted/30">
                                            <TableCell className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold">{c.description}</span>
                                                    <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-3 text-right">
                                                <span className={cn("text-xs font-bold", c.type === 'debit' ? "text-red-500" : "text-green-500")}>
                                                    {c.type === 'debit' ? '-' : '+'}{c.amount}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <History className="h-3 w-3" /> Dernières Activités
                    </h4>
                    <div className="space-y-2">
                        {userDetails?.logs?.map((l: any) => (
                            <div key={l.id || l.timestamp} className="p-3 rounded-lg border bg-muted/5 flex items-start gap-3">
                                <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", l.status === 'success' ? "bg-green-500" : "bg-red-500")} />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wider">{l.action}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{JSON.stringify(l.details)}</p>
                                    <p className="text-[9px] text-muted-foreground/60 mt-1">{new Date(l.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

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
              <Label className="text-[10px] font-semibold text-muted-foreground">Email de l&apos;utilisateur</Label>
              <Input
                placeholder="user@example.com"
                className="h-9"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground">Rôle initial</Label>
              <Select
                value={formData.role}
                onValueChange={value => setFormData({...formData, role: value})}
              >
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
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button size="sm" onClick={handleCreateUser} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Lancer l&apos;invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
