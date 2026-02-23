"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  User as UserIcon,
  Sparkles,
  Settings,
  Mail,
  MapPin,
  Phone,
  Save,
  LogOut,
  Trash2,
  AlertTriangle,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { useUser, useAuth, useClerk } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const sections = [
  { id: "general", label: "Général", icon: UserIcon },
  { id: "contact", label: "Contact & Bio", icon: Sparkles },
  { id: "account", label: "Gestion du compte", icon: Settings },
]

export default function ProfilePage() {
  const router = useRouter()
  const { signOut } = useClerk()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const { getToken } = useAuth()

  const [activeSection, setActiveSection] = React.useState("general")
  const [isSaving, setIsSaving] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState("")

  const [formData, setFormData] = React.useState({
    phone: "",
    location: "",
    bio: ""
  })

  const fetchProfile = React.useCallback(async () => {
    if (!isClerkLoaded) return
    try {
      const token = await getToken()
      const data = await api.users.getProfile(token || undefined)
      setUser(data)
      setFormData({
        phone: data.phone || "",
        location: data.location || "" ,
        bio: data.bio || ""
      })
    } catch (error) {
      toast.error("Échec du chargement du profil")
    } finally {
      setLoading(false)
    }
  }, [getToken, isClerkLoaded])

  React.useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.users.updateProfile(formData, token || undefined)
      toast.success("Profil mis à jour")
    } catch (error) {
      toast.error("Échec de la mise à jour")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== "SUPPRIMER") return
    try {
      const token = await getToken()
      await api.users.delete(user.email, token || undefined)
      await signOut(() => router.push("/login"))
    } catch (error) {
      toast.error("Échec de la suppression")
    }
  }

  if (loading) return <div className="p-8 text-center">Chargement du profil...</div>

  const userEmail = clerkUser?.primaryEmailAddress?.emailAddress || user?.email
  const userName = clerkUser?.firstName || user?.name || userEmail?.split('@')[0]
  const userRole = (clerkUser?.publicMetadata?.role as string) || user?.role || "user"

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={clerkUser?.imageUrl} />
          <AvatarFallback>{userName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{userName}</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">{userEmail}</p>
            <Badge variant="secondary" className="uppercase text-[10px]">{userRole}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
        <nav className="space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              data-active={activeSection === s.id}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground data-[active=true]:font-medium transition-colors"
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {activeSection === "general" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Nom</Label>
                      <Input value={userName} readOnly className="h-9 bg-muted/50" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
                      <Input value={userEmail} readOnly className="h-9 bg-muted/50" />
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-xs text-amber-700">Les détails du compte sont gérés via Clerk.</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Statut" value="Actif" />
                <StatCard label="Vérification" value="Vérifié" />
                <StatCard label="Membre depuis" value={new Date(user?.createdAt || Date.now()).getFullYear()} />
              </div>
            </div>
          )}

          {activeSection === "contact" && (
            <form onSubmit={handleUpdate} className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Coordonnées & Bio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Téléphone</Label>
                      <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-9" placeholder="+33..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Localisation</Label>
                      <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="h-9" placeholder="Ville, Pays" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Bio</Label>
                    <Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="min-h-[100px]" placeholder="Parlez-nous de vous..." />
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4 flex justify-end">
                  <Button size="sm" type="submit" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" /> Enregistrer le profil
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}

          {activeSection === "account" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Sécurité & Accès</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-4">
                    <Button variant="outline" size="sm" onClick={() => signOut(() => router.push("/login"))}>
                      <LogOut className="h-4 w-4 mr-2" /> Déconnexion
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/docs"><FileText className="h-4 w-4 mr-2" /> Documentation</Link>
                    </Button>
                  </div>

                  <div className="pt-6 border-t border-destructive/20">
                    <div className="p-4 rounded-md bg-destructive/5 border border-destructive/10 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-destructive">Zone de danger</p>
                        <p className="text-xs text-muted-foreground">Supprimer définitivement votre compte et toutes vos données.</p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer le compte
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Veuillez taper <span className="font-bold text-foreground">SUPPRIMER</span> pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="SUPPRIMER" className="h-10 text-center font-bold tracking-widest border-destructive/50" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" disabled={deleteConfirm !== "SUPPRIMER"} onClick={handleDelete}>Supprimer définitivement le compte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}
