"use client"

import * as React from "react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Loader2,
  Shield,
  Mail,
  User as UserIcon,
  Calendar,
  MapPin,
  Phone,
  Save,
  Sparkles,
  LogOut,
  Trash2,
  AlertTriangle,
  Code2,
  CheckCircle2,
  Lock,
  Search,
  Settings
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
import { ScrollArea } from "@/components/ui/scroll-area"

const sections = [
  { id: "general", label: "Profil Général", icon: UserIcon },
  { id: "complementary", label: "Coordonnées & Bio", icon: Sparkles },
  { id: "account", label: "Gestion du Compte", icon: Settings },
]

export default function ProfilePage() {
  const router = useRouter()
  const { signOut } = useClerk()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const { getToken } = useAuth()
  const [updating, setUpdating] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("")
  const [activeSection, setActiveSection] = React.useState("general")

  const [email, setEmail] = React.useState("")
  const [name, setName] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [website, setWebsite] = React.useState("")
  const [phone, setPhone] = React.useState("")

  const fetchProfile = React.useCallback(async () => {
    if (!isClerkLoaded) return

    try {
      const token = await getToken()
      const data = await api.users.getProfile(token || undefined)
      setUser(data)
      if (data.email) setEmail(data.email)
      if (data.name) setName(data.name)
      if (data.bio) setBio(data.bio)
      if (data.location) setLocation(data.location)
      if (data.website) setWebsite(data.website)
      if (data.phone) setPhone(data.phone)
    } catch (error: any) {
      console.error("Profile fetch error:", error)
      toast.error(error.message || "Erreur lors du chargement du profil")
    } finally {
      setLoading(false)
    }
  }, [getToken, isClerkLoaded])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (phone && !/^\+?[0-9\s\-()]+$/.test(phone)) {
      toast.error("Format de numéro de téléphone invalide")
      return
    }

    setUpdating(true)
    try {
      const token = await getToken()
      const updateData: any = {
        email,
        name,
        bio,
        location,
        website,
        phone
      }
      await api.users.updateProfile(updateData, token || undefined)
      setUser((prev: any) => ({ ...prev, ...updateData }))
      toast.success("Profil mis à jour avec succès")
    } catch (error: any) {
      toast.error(error.message || "Échec de la mise à jour")
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      sessionStorage.clear()
      router.push("/login")
    } catch (error) {
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "SUPPRIMER") return

    setIsDeletingAccount(true)
    try {
      const token = await getToken()
      await api.users.delete(user.email, token || undefined)
      await signOut()
      sessionStorage.clear()
      router.push("/login")
    } catch (error: any) {
      toast.error(error.message || "Échec de la suppression du compte")
    } finally {
      setIsDeletingAccount(false)
      setShowDeleteDialog(false)
    }
  }

  const displayRole = React.useMemo(() => {
    if (isClerkLoaded && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress
      if (email && email.toLowerCase() === 'maruise237@gmail.com') return 'admin'
      return (clerkUser.publicMetadata?.role as string) || user?.role || 'user'
    }
    return user?.role || 'user'
  }, [isClerkLoaded, clerkUser, user])

  const hasProfileChanges = () => {
    if (!user) return false
    return bio !== (user.bio || "") ||
      location !== (user.location || "") ||
      phone !== (user.phone || "")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row items-center gap-8 bg-white/50 dark:bg-card/50 backdrop-blur-xl p-8 sm:p-10 rounded-lg border border-slate-200 dark:border-primary/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />

        <div className="relative z-10">
          <div className="relative group/avatar">
            <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-white dark:border-background shadow-2xl transition-all duration-300 group-hover/avatar:scale-105">
              <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} className="object-cover" />
              <AvatarFallback className="text-4xl font-black bg-primary/10 text-primary uppercase">
                {user?.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-background rounded-xl border border-slate-200 dark:border-primary/20 shadow-2xl group-hover/avatar:scale-110 transition-transform duration-300">
              <Shield className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 relative z-10 text-center lg:text-left">
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
                {user?.name || user?.email?.split('@')[0]}
              </h1>
              <div className="flex justify-center lg:justify-start">
                <Badge variant="outline" className="font-black text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg bg-primary/5 border-primary/20 text-primary shadow-lg backdrop-blur-md">
                  {displayRole === 'admin' ? 'Administrateur' : 'Utilisateur Premium'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group/item cursor-default">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 transition-transform group-hover/item:scale-110">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold tracking-tight">{user?.email}</span>
              </div>
              {user?.location && (
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group/item cursor-default">
                  <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 transition-transform group-hover/item:scale-110">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold tracking-tight">{user.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group/item cursor-default">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 transition-transform group-hover/item:scale-110">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold tracking-tight">Membre depuis {user?.created_at ? new Date(user.created_at).getFullYear() : '2024'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:sticky lg:top-24 space-y-6">
          <div className="glass-card p-4 rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl space-y-2">
            <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Navigation</h3>
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <Button
                    key={section.id}
                    variant="ghost"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full justify-start gap-4 h-14 font-black uppercase tracking-widest text-[10px] transition-all duration-200 rounded-lg",
                      isActive
                        ? "bg-primary/10 text-primary border-r-4 border-primary shadow-inner"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 transition-transform", isActive && "scale-110")} />
                    {section.label}
                  </Button>
                )
              })}
            </nav>
          </div>

          <Card className="rounded-lg border border-slate-200 dark:border-primary/5 bg-primary/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Sécurité</h4>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
              Certaines informations sont gérées par **Clerk** pour garantir la sécurité maximale de votre compte.
            </p>
          </Card>
        </aside>

        {/* Content Pane */}
        <main className="space-y-10">
          {activeSection === "general" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-xl overflow-hidden bg-white/50 dark:bg-card/50 backdrop-blur-md relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
                <CardHeader className="p-8 sm:p-10 border-b border-slate-100 dark:border-primary/5 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-black uppercase tracking-tight">Informations Générales</CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        Données synchronisées avec votre compte authentifié.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 sm:p-10 space-y-8 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-80">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Adresse Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          readOnly
                          value={email}
                          className="h-14 pl-12 rounded-xl border-2 border-slate-100 bg-slate-50/50 dark:bg-muted/20 dark:border-primary/5 font-bold text-sm cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Nom Complet</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input
                          readOnly
                          value={name}
                          className="h-14 pl-12 rounded-xl border-2 border-slate-100 bg-slate-50/50 dark:bg-muted/20 dark:border-primary/5 font-bold text-sm cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 dark:text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-4 animate-pulse">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    Pour modifier ces informations, veuillez utiliser le portail client Clerk.
                  </div>
                </CardContent>
              </Card>

              {/* Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-lg flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Statut</p>
                    <p className="text-sm font-black uppercase">Actif</p>
                  </div>
                </Card>
                <Card className="p-6 bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-lg flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
                  <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Vérification</p>
                    <p className="text-sm font-black uppercase">Approuvé</p>
                  </div>
                </Card>
                <Card className="p-6 bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-lg flex items-center gap-5 group hover:border-primary/30 transition-all duration-300">
                  <div className="p-3 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Plan</p>
                    <p className="text-sm font-black uppercase">Premium</p>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeSection === "complementary" && (
            <form onSubmit={handleUpdateProfile} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="rounded-lg border-2 border-primary/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] to-transparent pointer-events-none" />
                <CardHeader className="p-8 sm:p-10 border-b border-primary/10 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/10 rounded-2xl border-2 border-primary/20 shadow-inner group-hover:rotate-6 transition-transform duration-300">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-black uppercase tracking-tight text-primary">Coordonnées & Bio</CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-relaxed">
                        Personnalisez votre présence sur la plateforme Whappi.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 sm:p-10 space-y-10 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Numéro de Téléphone</Label>
                      <div className="relative group/input">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within/input:text-primary transition-colors" />
                        <Input
                          placeholder="+33 6 00 00 00 00"
                          className="h-16 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50/50 dark:bg-muted/10 dark:border-primary/5 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-sm shadow-inner"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Localisation</Label>
                      <div className="relative group/input">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within/input:text-primary transition-colors" />
                        <Input
                          placeholder="Paris, France"
                          className="h-16 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50/50 dark:bg-muted/10 dark:border-primary/5 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-sm shadow-inner"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Biographie</Label>
                    <Textarea
                      placeholder="Parlez-nous de vos projets d'automatisation..."
                      className="min-h-[160px] rounded-2xl border-2 border-slate-100 bg-slate-50/50 dark:bg-muted/10 dark:border-primary/5 focus:ring-primary/20 focus:border-primary/30 transition-all font-bold text-sm p-6 resize-none shadow-inner leading-relaxed"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-8 sm:p-10 pt-0 flex justify-end relative z-10">
                  <Button
                    type="submit"
                    disabled={updating || !hasProfileChanges()}
                    className="h-14 px-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:grayscale"
                  >
                    {updating ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-3" />
                    ) : (
                      <Save className="w-5 h-5 mr-3" />
                    )}
                    Sauvegarder les changements
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}

          {activeSection === "account" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="rounded-lg border-2 border-slate-200 dark:border-primary/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-xl group">
                <CardHeader className="p-8 sm:p-10 border-b border-slate-100 dark:border-primary/5">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-2xl border-2 border-transparent group-hover:border-slate-500 transition-colors">
                      <Settings className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-black uppercase tracking-tight">Gestion & Accès</CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                        Contrôlez vos sessions et la visibilité de vos données.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8 sm:p-10 space-y-12">
                  <div className="flex flex-wrap items-center gap-6">
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="h-14 px-10 rounded-xl font-black uppercase tracking-[0.2em] border-2 border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-all text-[10px] group/logout"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-3" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-3 group-hover/logout:-translate-x-1 transition-transform" />
                      )}
                      Déconnexion Sécurisée
                    </Button>

                    <Link href="/docs">
                      <Button
                        variant="ghost"
                        className="h-14 px-10 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-500 hover:text-primary transition-all gap-3 hover:bg-primary/5"
                      >
                        <Code2 className="w-4 h-4" />
                        Documentation API
                      </Button>
                    </Link>
                  </div>

                  <div className="pt-10 border-t-2 border-dashed border-rose-500/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 p-8 rounded-2xl bg-rose-500/[0.03] border-2 border-rose-500/10">
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-rose-600 flex items-center gap-3 uppercase tracking-widest">
                          <AlertTriangle className="w-5 h-5" />
                          Zone de Danger Critique
                        </h4>
                        <p className="text-[11px] text-muted-foreground max-w-md font-medium leading-relaxed uppercase tracking-tight opacity-70">
                          La suppression est définitive. Toutes vos configurations IA, messages et sessions seront effacés.
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => setShowDeleteDialog(true)}
                        className="h-14 px-10 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] text-rose-600 hover:bg-rose-600 hover:text-white transition-all group/delete shadow-lg hover:shadow-rose-600/20"
                      >
                        <Trash2 className="w-4 h-4 mr-3 transition-transform group-hover/delete:scale-125 group-hover/delete:rotate-12" />
                        Supprimer le Compte
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-4 border-rose-600/20 rounded-2xl bg-background/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(225,29,72,0.2)]">
          <div className="p-10 space-y-8 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-rose-600/10 flex items-center justify-center animate-bounce">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
            </div>
            <div className="space-y-3">
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase text-rose-600">
                Action Irréversible
              </DialogTitle>
              <DialogDescription className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/80 leading-relaxed px-4">
                Êtes-vous absolument certain de vouloir détruire ce compte et toutes ses données associées ?
              </DialogDescription>
            </div>

            <div className="space-y-4 px-4 pt-4 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">
                Tapez <span className="text-rose-600">SUPPRIMER</span> pour confirmer
              </Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="SUPPRIMER"
                className="h-16 rounded-xl border-2 border-rose-600/20 bg-rose-500/[0.02] focus:border-rose-600 focus:ring-rose-500/20 text-center font-black tracking-[0.5em] text-rose-600 transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteConfirmation("")
                }}
                className="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-xl border-2 border-slate-200 dark:border-primary/10 hover:bg-slate-50"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== "SUPPRIMER" || isDeletingAccount}
                className="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/30 transition-all duration-300 disabled:grayscale"
              >
                {isDeletingAccount ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Confirmer la destruction"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
