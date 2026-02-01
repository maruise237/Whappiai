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
  CircleX,
  LoaderCircle
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
import { api } from "@/lib/api"
import { toast } from "sonner"
import { showAlert, showConfirm, showLoading } from "@/lib/swal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserData {
  email: string;
  role: 'admin' | 'user';
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
  
  // Form states
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    role: "user" as "user" | "admin",
    isActive: true
  })

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await api.users.list()
      setUsers(data || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchUsers()
  }, [])

  const handleAddUser = async () => {
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all required fields")
      return
    }
    try {
      await api.users.create(formData)
      toast.success("User created successfully")
      setIsAddingUser(false)
      setFormData({ email: "", password: "", role: "user", isActive: true })
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Failed to create user")
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    try {
      await api.users.update(editingUser.email, {
        role: formData.role,
        isActive: formData.isActive,
        password: formData.password || undefined // Only update password if provided
      })
      toast.success("User updated successfully")
      setEditingUser(null)
      setFormData({ email: "", password: "", role: "user", isActive: true })
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    }
  }

  const handleDeleteUser = async (id: string) => {
    const result = await showConfirm(
      "Supprimer l'utilisateur ?",
      `Voulez-vous vraiment supprimer l'utilisateur "${id}" ? Cette action est irréversible.`,
      "warning"
    )
    if (!result.isConfirmed) return
    
    const loadingAlert = showLoading("Suppression de l'utilisateur...")
    try {
      await api.users.delete(id)
      loadingAlert.close()
      showAlert("Supprimé", "L'utilisateur a été supprimé avec succès.", "success")
      fetchUsers()
    } catch (error: any) {
      loadingAlert.close()
      showAlert("Erreur", error.message || "Impossible de supprimer l'utilisateur", "error")
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage access and permissions for your team.</p>
        </div>
        
        <Dialog open={isAddingUser} onOpenChange={(open) => {
          setIsAddingUser(open)
          if (open) setFormData({ email: "", password: "", role: "user", isActive: true })
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new account for a team member.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  placeholder="user@example.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role}
                  onValueChange={(val: "user" | "admin") => setFormData({...formData, role: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddUser}>Create User</Button>
            </DialogFooter>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update account settings for {editingUser?.email}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password (Optional)</Label>
              <Input 
                id="edit-password" 
                type="password" 
                placeholder="Leave blank to keep current"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select 
                value={formData.role}
                onValueChange={(val: "user" | "admin") => setFormData({...formData, role: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between space-x-2 py-2">
              <Label htmlFor="active-status" className="font-bold">Active Account</Label>
              <Switch 
                id="active-status" 
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-2 border-primary/10 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <LoaderCircle className="w-6 h-6 animate-spin text-primary" />
                    <span>Loading users...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.email} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.email[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.email}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1" suppressHydrationWarning>
                          <History className="w-3 h-3" />
                          Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="gap-1 px-2">
                      {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {user.sessions?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" suppressHydrationWarning>
                        <Calendar className="w-3 h-3" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                      <span>By {user.createdBy || 'System'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                        <CircleCheck className="w-3 h-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <CircleX className="w-3 h-3" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditingUser(user)}>
                          <Pencil className="w-4 h-4" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => handleDeleteUser(user.email)}
                        >
                          <Trash2 className="w-4 h-4" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
