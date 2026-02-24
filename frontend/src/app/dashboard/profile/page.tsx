"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Save,
  LogOut,
  Trash2,
  Clock,
  MapPin,
  Mail,
  Smartphone,
  Volume2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser, useAuth, useClerk } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ProfilePage() {
  const router = useRouter()
  const { signOut } = useClerk()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const { getToken } = useAuth()

  const [isSaving, setIsSaving] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState("")

  const [formData, setFormData] = React.useState({
    name: "",
    organization_name: "",
    timezone: "UTC",
    address: "",
    sound_notifications: true,
    bio: "",
    phone: "",
    location: ""
  })

  const fetchProfile = React.useCallback(async () => {
    if (!isClerkLoaded) return
    try {
      const token = await getToken()
      const data = await api.users.getProfile(token || undefined)
      setUser(data)
      setFormData({
        name: data.name || "",
        organization_name: data.organization_name || "",
        timezone: data.timezone || "UTC",
        address: data.address || "",
        sound_notifications: data.sound_notifications !== 0,
        bio: data.bio || "",
        phone: data.phone || "",
        location: data.location || ""
      })
    } catch (error) {
      toast.error("Échec du chargement du profil")
    } finally {
      setLoading(false)
    }
  }, [getToken, isClerkLoaded])

  React.useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleUpdate = async () => {
    setIsSaving(true)
    try {
      const token = await getToken()
      const payload = {
        ...formData,
        sound_notifications: formData.sound_notifications ? 1 : 0
      }
      await api.users.updateProfile(payload, token || undefined)
      toast.success("Paramètres mis à jour")
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
  const userName = clerkUser?.firstName || formData.name || userEmail?.split('@')[0]
  const userRole = (clerkUser?.publicMetadata?.role as string) || user?.role || "user"

  const timezones = [
    "UTC",
    "Africa/Douala",
    "Africa/Lagos",
    "Africa/Nairobi",
    "Africa/Johannesburg",
    "Europe/Paris",
    "Europe/London",
    "Europe/Berlin",
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Asia/Dubai",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney"
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Gérez les informations de votre compte et de votre organisation Whappi.</p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase text-[10px]">{userRole}</Badge>
            <Button variant="ghost" size="sm" onClick={() => signOut(() => router.push("/login"))}>
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Image Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Image</CardTitle>
            <CardDescription className="text-xs">Ajoutez une image personnalisée à votre organisation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={clerkUser?.imageUrl} />
                <AvatarFallback className="bg-primary/5 text-primary text-xl">{userName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium">Cliquez ou glissez-déposez pour télécharger</p>
                <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. 1MB max.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nom Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Nom</CardTitle>
            <CardDescription className="text-xs">Utilisez le nom de votre organisation ou votre nom si vous n&apos;avez pas d&apos;organisation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={formData.organization_name || formData.name}
              onChange={e => setFormData({...formData, organization_name: e.target.value})}
              placeholder="Nom de l'organisation"
              className="h-10"
            />
          </CardContent>
        </Card>

        {/* Fuseau horaire Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Fuseau horaire
            </CardTitle>
            <CardDescription className="text-xs">Choisissez le fuseau horaire par défaut utilisé pour les automatisations et la planification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={formData.timezone}
              onValueChange={v => setFormData({...formData, timezone: v})}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Sélectionner un fuseau horaire" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Sélection actuelle : {formData.timezone}</p>
          </CardContent>
        </Card>

        {/* Adresse Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Adresse
            </CardTitle>
            <CardDescription className="text-xs">Veuillez saisir l&apos;adresse de votre organisation à des fins de facturation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              placeholder="123, rue Principale, Ville, Pays"
              className="h-10"
            />
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Volume2 className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                    <p className="text-base font-semibold">Notifications Sonores</p>
                    <p className="text-xs text-muted-foreground">Activer le son lors de l&apos;arrivée de nouveaux messages sur le dashboard.</p>
                </div>
              </div>
              <Switch
                checked={formData.sound_notifications}
                onCheckedChange={v => setFormData({...formData, sound_notifications: v})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Info (Secondary) */}
        <Card className="border-border bg-muted/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Informations du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Email de connexion</Label>
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted border text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {userEmail}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Numéro associé</Label>
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted border text-sm text-muted-foreground">
                            <Smartphone className="h-3.5 w-3.5" />
                            {user?.whatsapp_number || "Non connecté"}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Zone de danger
                </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Supprimer définitivement votre compte et toutes vos données Whappi.</p>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    Supprimer le compte
                </Button>
            </CardContent>
        </Card>
      </div>

      {/* Fixed Save Bar */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          size="lg"
          className="shadow-xl bg-primary hover:bg-primary/90 text-white gap-2 px-8 h-12"
          onClick={handleUpdate}
          disabled={isSaving}
        >
          {isSaving ? "Enregistrement..." : (
            <>
              <Save className="h-5 w-5" /> Enregistrer les modifications
            </>
          )}
        </Button>
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
