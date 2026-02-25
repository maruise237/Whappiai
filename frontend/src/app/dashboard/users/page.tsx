"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, MoreHorizontal, Lock } from "lucide-react"
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
import { Card } from "@/components/ui/card"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useUser, useAuth } from "@clerk/nextjs"
import { showConfirm } from "@/lib/swal"
import { cn } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const userSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères").optional().or(z.literal('')),
  role: z.enum(["user", "admin", "collaborateur"]),
  isActive: z.boolean(),
})

export default function UsersPage() {
  const [users, setUsers] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAddingUser, setIsAddingUser] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<any>(null)
  const [userRole, setUserRole] = React.useState<string | null>(null)
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 5
  const usersList = Array.isArray(users) ? users : []
  const totalPages = Math.ceil(usersList.length / itemsPerPage)
  const paginatedUsers = usersList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { email: "", password: "", role: "user", isActive: true }
  })

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.users.list(token || undefined)
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {} finally { setIsLoading(false) }
  }

  React.useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress
      let role = (user.publicMetadata?.role as string) || "user"
      if (email?.toLowerCase() === 'maruise237@gmail.com') role = 'admin'
      setUserRole(role)
      if (role === 'admin') fetchUsers()
    }
  }, [isLoaded, user])

  const onSaveUser = async (values: z.infer<typeof userSchema>) => {
    try {
      const token = await getToken()
      if (editingUser) {
        await api.users.update(editingUser.email, {
          role: values.role,
          isActive: values.isActive,
          password: values.password || undefined
        }, token || undefined)
        toast.success("Utilisateur mis à jour")
      } else {
        await api.users.create(values, token || undefined)
        toast.success("Utilisateur créé")
      }
      setIsAddingUser(false)
      setEditingUser(null)
      form.reset()
      fetchUsers()
    } catch (error: any) { toast.error(error.message || "Échec de l'enregistrement") }
  }

  const handleDeleteUser = async (email: string) => {
    const res = await showConfirm("Supprimer l'utilisateur ?", `Supprimer ${email} ?`, "warning")
    if (!res.isConfirmed) return
    try {
      const token = await getToken()
      await api.users.delete(email, token || undefined)
      toast.success("Utilisateur supprimé")
      fetchUsers()
    } catch (e) {}
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
          <h1 className="text-xl font-semibold">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Gérez votre équipe et les permissions.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingUser(null); form.reset({ email: "", password: "", role: "user", isActive: true }); setIsAddingUser(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter un utilisateur
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-medium text-muted-foreground">Utilisateur</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Rôle</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">Statut</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground hidden md:table-cell">Inscrit le</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs">Chargement...</TableCell></TableRow>
            ) : paginatedUsers.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-xs text-muted-foreground">Aucun utilisateur trouvé.</TableCell></TableRow>
            ) : (
              paginatedUsers.map((u) => (
                <TableRow key={u.email} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{u.email.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{u.email}</span>
                        <Badge variant="outline" className="w-fit text-[9px] h-4">UID: {u.email.split('@')[0]}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] uppercase">{u.role}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("h-1.5 w-1.5 rounded-full", u.isActive ? "bg-primary" : "bg-muted-foreground/30")} />
                      <span className="text-xs">{u.isActive ? "Actif" : "Inactif"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingUser(u); form.reset({ ...u, password: "" }); setIsAddingUser(true); }}><Pencil className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(u.email)}><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}><PaginationLink onClick={() => setCurrentPage(i + 1)} isActive={currentPage === i + 1} className="cursor-pointer">{i + 1}</PaginationLink></PaginationItem>
                ))}
                <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSaveUser)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</DialogTitle>
                <DialogDescription>Définissez les rôles et les permissions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase">Adresse Email</FormLabel><FormControl><Input {...field} disabled={!!editingUser} className="h-9" /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase">{editingUser ? "Nouveau mot de passe (Optionnel)" : "Mot de passe"}</FormLabel><FormControl><Input type="password" {...field} className="h-9" /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs uppercase">Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem><SelectItem value="collaborateur">Collaborateur</SelectItem></SelectContent></Select><FormMessage className="text-[10px]" /></FormItem>
                )} />
                {editingUser && (
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-3 border rounded-md"><Label className="text-xs">Compte actif</Label><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                  )} />
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" type="button" onClick={() => setIsAddingUser(false)}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
