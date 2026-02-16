"use client"

import * as React from "react"
import { 
  UserPlus, 
  Pencil, 
  Trash2, 
  Shield, 
  User, 
  MoreHorizontal,
  Mail,
  Calendar,
  History,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface UserData {
  email: string;
  role: 'admin' | 'user' | 'collaborateur';
  sessions: any[];
  createdBy: string;
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<UserData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAddingUser, setIsAddingUser] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<UserData | null>(null)
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = React.useState<string | null>(null)
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  
  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(users.length / itemsPerPage)
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Form states
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    role: "collaborateur" as "user" | "admin" | "collaborateur",
    isActive: true
  })

  const { formRef, validate } = usePristine()

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.users.list(token || undefined)
      setUsers(data || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users")
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
      setCurrentUserEmail(email || null)
      
      // Set default role based on current user role
      if (role === 'admin') {
        setFormData(prev => ({ ...prev, role: 'user' }))
        fetchUsers()
      } else {
        setFormData(prev => ({ ...prev, role: 'collaborateur' }))
        toast.error("Accès refusé")
      }
    }
  }, [isLoaded, user])

  const handleAddUser = async () => {
    if (!validate()) return

    try {
      const token = await getToken()
      await api.users.create(formData, token || undefined)
      toast.success("User created successfully")
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#d8b4fe', '#ffffff']
      })
      setIsAddingUser(false)
      
      // Reset form with appropriate default role
      const role = sessionStorage.getItem("userRole")
      setFormData({ 
        email: "", 
        password: "", 
        role: role === 'admin' ? "user" : "collaborateur", 
        isActive: true 
      })
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Failed to create user")
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    try {
      const token = await getToken()
      await api.users.update(editingUser.email, {
        role: formData.role,
        isActive: formData.isActive,
        password: formData.password || undefined // Only update password if provided
      }, token || undefined)
      toast.success("User updated successfully")
      setEditingUser(null)
      
      // Reset form with appropriate default role
      const role = sessionStorage.getItem("userRole")
      setFormData({ 
        email: "", 
        password: "", 
        role: role === 'admin' ? "user" : "collaborateur", 
        isActive: true 
      })
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    }
  }

  const handleDeleteUser = async (email: string) => {
    const result = await showConfirm(
      "Supprimer l'utilisateur",
      `Êtes-vous sûr de vouloir supprimer l'utilisateur ${email} ?`,
      "warning"
    )

    if (result.isConfirmed) {
      try {
        showLoading("Suppression en cours...")
        const token = await getToken()
        await api.users.delete(email, token || undefined)
        MySwal.close()
        toast.success("Utilisateur supprimé")
        fetchUsers()
      } catch (error: any) {
        MySwal.close()
        toast.error(error.message || "Erreur lors de la suppression")
      }
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/30 backdrop-blur-2xl p-10 rounded-lg border-2 border-primary/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg shadow-inner group-hover:scale-110 transition-transform duration-200">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase">
                Gestion des Utilisateurs
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-lg border-2 bg-background/50 border-muted/50 shadow-sm">
                  {users.length} UTILISATEURS TOTAL
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">
            Gérez les accès, les rôles et les permissions de votre équipe Whappi.
          </p>
        </div>
        
        <Dialog open={isAddingUser} onOpenChange={(open) => {
          setIsAddingUser(open)
          if (open) {
            const role = sessionStorage.getItem("userRole")
            setFormData({ 
              email: "", 
              password: "", 
              role: role === 'admin' ? "user" : "collaborateur", 
              isActive: true 
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="h-14 px-10 font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 rounded-lg text-[10px] gap-3 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] border-2 border-primary/20 relative z-10">
              <UserPlus className="w-5 h-5" />
              Ajouter un Utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto border-2 rounded-lg p-0 gap-0 bg-background/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <form ref={formRef} className="flex flex-col h-full" onSubmit={(e) => { e.preventDefault(); editingUser ? handleUpdateUser() : handleAddUser(); }}>
              <div className="p-10 pb-6">
                <DialogHeader>
                  <div className="flex items-center gap-5 mb-4">
                    <div className="p-4 bg-primary/10 rounded-lg shadow-inner">
                      <UserPlus className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1 text-left">
                      <DialogTitle className="text-2xl font-black tracking-tight uppercase">Nouvel Utilisateur</DialogTitle>
                      <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                        Créez un nouveau compte pour un membre de votre équipe.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-8 py-8">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Adresse Email</Label>
                    <div className="relative group">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="email" 
                        name="email"
                        type="email" 
                        placeholder="user@example.com" 
                        className="pl-14 h-16 border-2 rounded-lg font-black bg-background shadow-inner transition-all duration-200 focus:ring-primary/20 group-hover:bg-muted/5 group-hover:border-primary/20"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        data-pristine-required-message="L'email est requis"
                        data-pristine-email-message="Veuillez entrer un email valide"
                      />
                    </div>
                  </div>
                  {!editingUser && (
                    <div className="space-y-3">
                    <Label htmlFor="password" title="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Mot de passe</Label>
                    <div className="relative group">
                      <Input 
                        id="password" 
                        name="password"
                        type="password" 
                        placeholder="••••••••"
                        className="h-16 border-2 rounded-lg font-black bg-background shadow-inner transition-all duration-200 focus:ring-primary/20 pl-6 group-hover:bg-muted/5 group-hover:border-primary/20"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                        data-pristine-required-message="Le mot de passe est requis"
                        data-pristine-minlength="6"
                        data-pristine-minlength-message="Minimum 6 caractères"
                      />
                    </div>
                  </div>
                  )}
                  <div className="space-y-3">
                    <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Rôle & Permissions</Label>
                    <Select 
                      value={formData.role}
                      onValueChange={(val: "user" | "admin" | "collaborateur") => setFormData({...formData, role: val})}
                    >
                      <SelectTrigger className="h-16 border-2 rounded-lg font-black bg-background shadow-inner transition-all duration-200 focus:ring-primary/20 pl-6 hover:bg-muted/5 hover:border-primary/20">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-2 border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 p-2">
                        {userRole === 'admin' ? (
                          <>
                            <SelectItem value="user" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Utilisateur</SelectItem>
                            <SelectItem value="admin" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Administrateur</SelectItem>
                            <SelectItem value="collaborateur" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Collaborateur</SelectItem>
                          </>
                        ) : (
                          <SelectItem value="collaborateur" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Collaborateur</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="p-10 border-t border-muted/20 bg-muted/5 flex flex-col sm:flex-row gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsAddingUser(false)}
                  className="h-16 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px] order-2 sm:order-1 hover:bg-muted/10"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="h-16 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px] shadow-xl shadow-primary/20 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] border-2 border-primary/20 order-1 sm:order-2"
                >
                  Créer l'Utilisateur
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => {
        if (!open) setEditingUser(null)
        else if (editingUser) {
          setFormData({
            email: editingUser.email,
            password: "",
            role: editingUser.role,
            isActive: editingUser.isActive
          })
        }
      }}>
        <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto border-2 rounded-lg p-0 gap-0 bg-background/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex flex-col h-full">
            <div className="p-10 pb-6">
              <DialogHeader>
                <div className="flex items-center gap-5 mb-4">
                  <div className="p-4 bg-primary/10 rounded-lg shadow-inner">
                    <Pencil className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-1 text-left">
                    <DialogTitle className="text-2xl font-black tracking-tight uppercase">Modifier l'Utilisateur</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                      Mettre à jour les paramètres pour {editingUser?.email}.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-8 py-8">
                <div className="space-y-3">
                  <Label htmlFor="edit-password" title="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Nouveau Mot de passe (Optionnel)</Label>
                  <div className="relative group">
                    <Input 
                      id="edit-password" 
                      type="password" 
                      placeholder="Laisser vide pour conserver l'actuel"
                      className="h-16 border-2 rounded-lg font-black bg-background shadow-inner transition-all duration-200 focus:ring-primary/20 pl-6 group-hover:bg-muted/5 group-hover:border-primary/20"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="edit-role" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-3">Rôle & Permissions</Label>
                  <Select 
                    value={formData.role}
                    onValueChange={(val: "user" | "admin" | "collaborateur") => setFormData({...formData, role: val})}
                  >
                    <SelectTrigger className="h-16 border-2 rounded-lg font-black bg-background shadow-inner transition-all duration-200 focus:ring-primary/20 pl-6 hover:bg-muted/5 hover:border-primary/20">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-2 border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 p-2">
                      {userRole === 'admin' ? (
                        <>
                          <SelectItem value="user" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Utilisateur</SelectItem>
                          <SelectItem value="admin" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Administrateur</SelectItem>
                          <SelectItem value="collaborateur" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Collaborateur</SelectItem>
                        </>
                      ) : (
                        <SelectItem value="collaborateur" className="rounded-lg font-black text-[10px] uppercase tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer">Collaborateur</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-6 bg-primary/5 rounded-lg border-2 border-primary/10 shadow-inner">
                  <div className="space-y-0.5">
                    <Label htmlFor="active-status" className="text-[11px] font-black uppercase tracking-widest">Compte Actif</Label>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Désactiver pour suspendre l'accès</p>
                  </div>
                  <Switch 
                    id="active-status" 
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-10 border-t border-muted/20 bg-muted/5 flex flex-col sm:flex-row gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setEditingUser(null)}
                className="h-16 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px] order-2 sm:order-1 hover:bg-muted/10"
              >
                Annuler
              </Button>
              <Button 
                  onClick={handleUpdateUser}
                  className="h-16 px-10 font-black uppercase tracking-[0.2em] rounded-lg text-[10px] shadow-xl shadow-primary/20 transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] border-2 border-primary/20 order-1 sm:order-2"
                >
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-2 border-primary/10 shadow-2xl overflow-hidden rounded-lg bg-card/30 backdrop-blur-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        {isLoading ? (
          <div className="p-10">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : users.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-muted-foreground gap-6 relative z-10">
            <div className="p-6 bg-primary/5 rounded-lg shadow-inner animate-pulse transition-all duration-200">
              <User className="w-16 h-16 opacity-20 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black uppercase tracking-widest bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Aucun utilisateur trouvé</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Commencez par ajouter un nouveau membre à votre équipe.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-primary/10">
                  <TableHead className="w-[300px] font-black uppercase tracking-[0.2em] text-[10px] py-8 pl-10 text-primary/70">Utilisateur</TableHead>
                  <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] py-8 text-primary/70">Rôle & Permissions</TableHead>
                  <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] py-8 text-primary/70">Activité</TableHead>
                  <TableHead className="hidden md:table-cell font-black uppercase tracking-[0.2em] text-[10px] py-8 text-primary/70">Date d'adhésion</TableHead>
                  <TableHead className="w-[100px] py-8 pr-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.email} className="group border-b border-primary/5 hover:bg-primary/[0.02] transition-colors duration-200">
                    <TableCell className="py-8 pl-10">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-200">
                          <User className="h-7 h-7 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-sm tracking-tight uppercase">{user.email}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border-primary/20 bg-primary/5 text-primary/70">
                              UID: {user.email.split('@')[0]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg shadow-lg shadow-primary/20 border-2 border-primary/20">
                              <Shield className="w-3 h-3 mr-1.5" />
                              Administrateur
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg border-2 border-muted/20">
                              <User className="w-3 h-3 mr-1.5" />
                              Utilisateur
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40 ml-1">Permissions Complètes</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-8">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-sm animate-pulse",
                            user.isActive ? "bg-primary shadow-primary/50" : "bg-muted-foreground/30"
                          )} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {user.isActive ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <History className="w-3 h-3 opacity-40" />
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                            {user.lastLogin ? `Dernière connexion: ${new Date(user.lastLogin).toLocaleDateString()}` : 'Jamais connecté'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-8">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Calendar className="w-4 h-4 opacity-40" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                          {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-8 pr-10 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-12 w-12 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200">
                            <MoreHorizontal className="h-6 w-6" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-lg border-2 border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
                          <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-4 py-3">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-primary/5" />
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingUser(user)
                              setFormData({
                                email: user.email,
                                password: "",
                                role: user.role,
                                isActive: user.isActive
                              })
                            }}
                            className="rounded-lg px-4 py-3 text-[10px] font-black uppercase tracking-widest gap-3 focus:bg-primary/10 focus:text-primary transition-all duration-200 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                            Modifier
                          </DropdownMenuItem>
                          {user.email.toLowerCase() !== currentUserEmail?.toLowerCase() && (
                            <DropdownMenuItem 
                              className="rounded-lg px-4 py-3 text-[10px] font-black uppercase tracking-widest gap-3 text-destructive focus:bg-destructive/10 focus:text-destructive transition-all duration-200 cursor-pointer"
                              onClick={() => handleDeleteUser(user.email)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {users.length > itemsPerPage && (
          <div className="p-10 border-t border-primary/5">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={cn(
                      "cursor-pointer hover:bg-primary/10 hover:text-primary rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all duration-200",
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                      className={cn(
                        "cursor-pointer rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all duration-200",
                        currentPage === i + 1 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={cn(
                      "cursor-pointer hover:bg-primary/10 hover:text-primary rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all duration-200",
                      currentPage === totalPages && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  )
}
