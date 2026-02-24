"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Building,
  User as UserIcon
} from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  const [activeSection, setActiveSection] = React.useState("general")
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

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Chargement du profil...</div>

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

  const sections = [
    { id: "general", name: "Général", icon: UserIcon },
    { id: "preferences", name: "Préférences", icon: ShieldCheck },
    { id: "account", name: "Compte & Facturation", icon: Building },
    { id: "danger", name: "Danger Zone", icon: Trash2 },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Personnalisez votre expérience Whappi et gérez votre organisation.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-6 px-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-muted-foreground/20">
            {userRole}
          </Badge>
        </div>
      </div>

      <div className="space-y-8">
        {/* Profile Image Card */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-muted/30 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-primary" /> Image de profil
            </CardTitle>
            <CardDescription className="text-xs">Identité visuelle de votre compte Whappi.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-4 border-background ring-1 ring-border shadow-md">
                <AvatarImage src={clerkUser?.imageUrl} />
                <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">{userName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Cliquez ou glissez-déposez pour télécharger</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Building className="h-3 w-3" /> Image d&apos;organisation recommandée
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">JPG, PNG ou GIF. 1MB max.</p>
              </div>
            </div>

        {/* Name Card */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-muted/30 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" /> Nom
            </CardTitle>
            <CardDescription className="text-xs">Le nom affiché pour votre organisation ou votre compte personnel.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Input
              value={formData.organization_name || formData.name}
              onChange={e => setFormData({...formData, organization_name: e.target.value})}
              placeholder="Ex: Ma Super Agence"
              className="h-10 text-sm font-medium border-border/60 focus-visible:ring-primary/20"
            />
          </CardContent>
        </Card>

        {/* Timezone Card */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-muted/30 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Fuseau horaire
            </CardTitle>
            <CardDescription className="text-xs">Détermine l&apos;heure d&apos;envoi des messages programmés et des rapports.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Select
              value={formData.timezone}
              onValueChange={v => setFormData({...formData, timezone: v})}
            >
              <SelectTrigger className="h-10 text-sm font-medium border-border/60">
                <SelectValue placeholder="Sélectionner un fuseau horaire" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz} value={tz} className="text-sm">{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border/40 w-fit">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actuellement : {formData.timezone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Address Card */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-muted/30 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Adresse
            </CardTitle>
            <CardDescription className="text-xs">Adresse de facturation et coordonnées de l&apos;organisation.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Input
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              placeholder="123, rue de l'Innovation, Douala, Cameroun"
              className="h-10 text-sm font-medium border-border/60"
            />
          </CardContent>
        </Card>

        {/* Sound Notifications Card */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Volume2 className="h-6 w-6 text-primary" />
                </div>
                <Switch
                  checked={formData.utm_tracking}
                  onCheckedChange={v => setFormData({...formData, utm_tracking: v})}
                />
              </div>

              <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-base font-semibold">Notifications Sonores</p>
                    <p className="text-xs text-muted-foreground">Ring audio lors de la réception d&apos;un nouveau message sur le dashboard.</p>
                </div>
                <Switch
                  checked={formData.bot_detection}
                  onCheckedChange={v => setFormData({...formData, bot_detection: v})}
                />
              </div>
              <Switch
                checked={formData.sound_notifications}
                onCheckedChange={v => setFormData({...formData, sound_notifications: v})}
                className="data-[state=checked]:bg-primary"
              />
            </div>

        {/* Connection Status & Account Card */}
        <Card className="border-border bg-muted/20 shadow-sm border-dashed">
            <CardHeader className="pb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Compte Whappi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email associé</Label>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/60 text-sm font-medium">
                            <Mail className="h-4 w-4 text-muted-foreground/60" />
                            {userEmail}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Numéro WhatsApp</Label>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/60 text-sm font-medium">
                            <Smartphone className="h-4 w-4 text-muted-foreground/60" />
                            {user?.whatsapp_number || "Non configuré"}
                        </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <Button variant="outline" size="sm" onClick={() => signOut(() => router.push("/login"))} className="h-9 px-4 border-border/60 bg-card hover:bg-muted">
                      <LogOut className="h-4 w-4 mr-2 text-muted-foreground" /> Déconnexion
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Danger Zone */}
        <div className="pt-8 border-t border-destructive/10">
            <Card className="border-destructive/20 bg-destructive/[0.02] shadow-sm overflow-hidden">
                <CardHeader className="pb-4 bg-destructive/[0.04] border-b border-destructive/10">
                    <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                        <Trash2 className="h-4 w-4" /> Zone de danger
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Supprimer le compte Whappi</p>
                        <p className="text-xs text-muted-foreground max-w-md">Cette action supprimera définitivement toutes vos sessions, contacts, logs et configurations. Aucune récupération possible.</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="h-9 px-6 bg-destructive hover:bg-destructive/90 transition-all font-semibold">
                        Supprimer
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Floating Save Action Bar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <div className="p-2 bg-background/60 backdrop-blur-xl border border-border/60 rounded-full shadow-2xl ring-1 ring-black/5">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white gap-3 px-10 h-12 rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
              onClick={handleUpdate}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mise à jour...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" /> Sauvegarder les modifications
                </>
              )}
            </Button>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px] border-destructive/20">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmation finale</DialogTitle>
            <DialogDescription>
              Êtes-vous certain ? Cette opération est irréversible. Tapez <span className="font-mono font-bold text-foreground bg-muted px-1 rounded select-none">SUPPRIMER</span> pour valider.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="SUPPRIMER"
                className="h-12 text-center font-black tracking-[0.3em] border-destructive/30 focus-visible:ring-destructive/20 uppercase"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="flex-1">Annuler</Button>
            <Button variant="destructive" disabled={deleteConfirm !== "SUPPRIMER"} onClick={handleDelete} className="flex-1 font-bold">Confirmer la suppression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
