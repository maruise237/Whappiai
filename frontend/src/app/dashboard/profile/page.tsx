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
  User as UserIcon,
  Globe,
  MapPin,
  Save,
  LogOut,
  Trash2,
  ShieldCheck,
  Zap,
  Clock,
  Building,
  Mail,
  Smartphone,
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
    double_opt_in: false,
    utm_tracking: false,
    bot_detection: false,
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
        double_opt_in: !!data.double_opt_in,
        utm_tracking: !!data.utm_tracking,
        bot_detection: !!data.bot_detection,
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
      // Convert booleans to integers for SQLite
      const payload = {
        ...formData,
        double_opt_in: formData.double_opt_in ? 1 : 0,
        utm_tracking: formData.utm_tracking ? 1 : 0,
        bot_detection: formData.bot_detection ? 1 : 0
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

  const sections = [
    { id: "general", name: "Général", icon: UserIcon },
    { id: "preferences", name: "Préférences", icon: ShieldCheck },
    { id: "account", name: "Compte & Facturation", icon: Building },
    { id: "danger", name: "Danger Zone", icon: Trash2 },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b pb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
          <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
            <AvatarImage src={clerkUser?.imageUrl} />
            <AvatarFallback className="text-2xl">{userName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{userName}</h1>
            <p className="text-muted-foreground text-sm flex items-center justify-center sm:justify-start gap-2">
              <Mail className="h-3.5 w-3.5" /> {userEmail}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <Badge variant="secondary" className="uppercase text-[10px] font-bold">{userRole}</Badge>
              {user?.whatsapp_number && (
                <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary bg-primary/5">
                  <Smartphone className="h-3 w-3 mr-1" /> {user.whatsapp_number}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => signOut(() => router.push("/login"))}>
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </Button>
          <Button size="sm" className="w-full sm:w-auto shadow-sm" onClick={handleUpdate} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" /> {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="lg:hidden sticky top-[56px] z-20 bg-background/95 backdrop-blur-sm border-b -mx-4 px-4 overflow-x-auto no-scrollbar">
        <Tabs value={activeSection} onValueChange={(v) => {
          setActiveSection(v);
          document.getElementById(v)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}>
          <TabsList className="h-12 bg-transparent gap-6 p-0">
            {sections.map(s => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 h-12 text-xs font-semibold"
              >
                {s.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12 items-start">
        {/* Desktop Sidebar Nav */}
        <aside className="hidden lg:block sticky top-24 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id)
                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              data-active={activeSection === s.id}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all hover:bg-muted",
                activeSection === s.id ? "bg-muted text-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              <s.icon className={cn("h-4 w-4", activeSection === s.id ? "text-primary" : "")} />
              {s.name}
            </button>
          ))}
        </aside>

        {/* Content Sections */}
        <div className="space-y-16">
          {/* Section Général */}
          <section id="general" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Général</h2>
              <p className="text-sm text-muted-foreground">Informations de base sur votre identité et organisation.</p>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nom de l&apos;organisation</Label>
                  <Input
                    value={formData.organization_name || formData.name}
                    onChange={e => setFormData({...formData, organization_name: e.target.value})}
                    placeholder="Nom de l'organisation"
                    className="h-10"
                  />
                  <p className="text-[10px] text-muted-foreground">Ce nom apparaîtra sur vos documents officiels et votre profil public.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Bio / Description</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    placeholder="Parlez-nous de vous..."
                    className="min-h-[120px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section Préférences */}
          <section id="preferences" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Préférences</h2>
              <p className="text-sm text-muted-foreground">Paramètres système et automatisations par défaut.</p>
            </div>

            <Card className="divide-y overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Fuseau horaire
                  </Label>
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
                </div>
              </div>

              <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Validation en deux étapes</p>
                  <p className="text-xs text-muted-foreground">Exiger confirmation avant les automatisations.</p>
                </div>
                <Switch
                  checked={formData.double_opt_in}
                  onCheckedChange={v => setFormData({...formData, double_opt_in: v})}
                />
              </div>

              <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Suivi des liens (UTM)</p>
                  <p className="text-xs text-muted-foreground">Ajout automatique des paramètres UTM.</p>
                </div>
                <Switch
                  checked={formData.utm_tracking}
                  onCheckedChange={v => setFormData({...formData, utm_tracking: v})}
                />
              </div>

              <div className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Filtrage anti-spam</p>
                  <p className="text-xs text-muted-foreground">Protéger votre compte contre les systèmes automatisés.</p>
                </div>
                <Switch
                  checked={formData.bot_detection}
                  onCheckedChange={v => setFormData({...formData, bot_detection: v})}
                />
              </div>
            </Card>
          </section>

          {/* Section Compte & Facturation */}
          <section id="account" className="scroll-mt-32 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Compte & Facturation</h2>
              <p className="text-sm text-muted-foreground">Gérez vos adresses et informations de paiement.</p>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Adresse de facturation
                  </Label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="123, rue Principale, Ville, Pays"
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Email de connexion</Label>
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {userEmail}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold">Numéro WhatsApp</Label>
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border text-sm">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      {user?.whatsapp_number || "Non connecté"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section Danger */}
          <section id="danger" className="scroll-mt-32 pt-8">
            <div className="space-y-1 mb-6">
              <h2 className="text-lg font-semibold text-destructive">Zone de danger</h2>
              <p className="text-sm text-muted-foreground">Actions irréversibles sur votre compte.</p>
            </div>

            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-sm font-semibold">Supprimer le compte</p>
                  <p className="text-xs text-muted-foreground">Toutes vos données seront définitivement effacées.</p>
                </div>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => setShowDeleteDialog(true)}>
                  Supprimer définitivement
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Veuillez taper <span className="font-bold text-foreground">SUPPRIMER</span> pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="SUPPRIMER" className="h-10 text-center font-bold tracking-widest border-destructive/50" />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" className="w-full sm:w-auto" disabled={deleteConfirm !== "SUPPRIMER"} onClick={handleDelete}>Supprimer définitivement le compte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
