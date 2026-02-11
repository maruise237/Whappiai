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
  Key, 
  User as UserIcon, 
  Calendar, 
  Clock, 
  MapPin, 
  Globe, 
  Phone, 
  Save, 
  Sparkles,
  LogOut,
  Trash2,
  AlertTriangle,
  Code2,
  ExternalLink
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
  
  const [email, setEmail] = React.useState("")
  const [name, setName] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [website, setWebsite] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [passwords, setPasswords] = React.useState({
    new: "",
    confirm: ""
  })

  const fetchProfile = React.useCallback(async () => {
    if (!isClerkLoaded) return
    
    try {
      const token = await getToken()
      const data = await api.users.getProfile(token || undefined)
      console.log("Profile data loaded:", data)
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwords.new) return
    
    if (passwords.new !== passwords.confirm) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    if (passwords.new.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    setUpdating(true)
    try {
      const token = await getToken()
      await api.users.updateProfile({ password: passwords.new }, token || undefined)
      toast.success("Mot de passe mis à jour avec succès")
      setPasswords({ new: "", confirm: "" })
    } catch (error: any) {
      const message = error.message || "Échec de la mise à jour"
      toast.error(message)
      
      if (message.includes("Utilisateur non trouvé")) {
        setTimeout(() => {
          window.location.href = "/login"
        }, 2000)
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (phone && !/^\+?[0-9\s\-()]+$/.test(phone)) {
      toast.error("Format de numéro de téléphone invalide")
      return
    }

    if (website && !website.startsWith('http')) {
      toast.error("L'URL du site web doit commencer par http:// ou https://")
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
      
      // If email changed, we might need to refresh to ensure session consistency
      if (email !== user.email) {
        toast.info("L'adresse email a été mise à jour. Redirection...")
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (error: any) {
      const message = error.message || "Échec de la mise à jour"
      toast.error(message)
      
      // If user not found, they might need to re-login
      if (message.includes("Utilisateur non trouvé")) {
        setTimeout(() => {
          window.location.href = "/login"
        }, 2000)
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      sessionStorage.clear()
      toast.success("Déconnexion réussie")
      router.push("/login")
    } catch (error: any) {
      console.error("Logout failed:", error)
      toast.error("Échec de la déconnexion")
      // Fallback: clear and redirect anyway
      sessionStorage.clear()
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "SUPPRIMER") {
      toast.error("Veuillez taper SUPPRIMER pour confirmer")
      return
    }

    setIsDeletingAccount(true)
    try {
      const token = await getToken()
      await api.users.delete(user.email, token || undefined)
      await signOut()
      sessionStorage.clear()
      toast.success("Votre compte a été supprimé avec succès")
      router.push("/login")
    } catch (error: any) {
      console.error("Account deletion failed:", error)
      toast.error(error.message || "Échec de la suppression du compte")
    } finally {
      setIsDeletingAccount(false)
      setShowDeleteDialog(false)
    }
  }

  const displayRole = React.useMemo(() => {
    if (isClerkLoaded && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress
      if (email && email.toLowerCase() === 'maruise237@gmail.com') {
        return 'admin'
      }
      return (clerkUser.publicMetadata?.role as string) || user?.role || 'user'
    }
    return user?.role || 'user'
  }, [isClerkLoaded, clerkUser, user])

  const hasProfileChanges = () => {
    if (!user) return false
    return email !== (user.email || "") ||
           name !== (user.name || "") || 
           bio !== (user.bio || "") || 
           location !== (user.location || "") || 
           website !== (user.website || "") || 
           phone !== (user.phone || "")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-10">
      {/* Profil Header Card */}
      <div className="flex flex-col lg:flex-row items-center gap-8 bg-white dark:bg-card p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-primary/10 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="relative z-10">
          <div className="relative group/avatar">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-white dark:border-background shadow-xl transition-all duration-200 group-hover/avatar:scale-105">
              <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} className="object-cover" />
              <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 p-2 bg-white dark:bg-background rounded-lg border border-slate-200 dark:border-primary/20 shadow-lg group-hover/avatar:scale-110 transition-transform duration-200">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-4 relative z-10 text-center lg:text-left">
          <div className="space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                {user?.name || user?.email?.split('@')[0]}
              </h1>
              <div className="flex justify-center lg:justify-start">
                <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-lg bg-primary/5 border-primary/20 text-primary shadow-sm">
                  {displayRole === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              {user?.location && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{user.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Membre depuis {user?.created_at ? new Date(user.created_at).getFullYear() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-8">
          {/* Settings Section (Clerk Controlled) */}
          <Card className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-lg overflow-hidden">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-primary/5 flex flex-row items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">Informations Personnelles</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-4 rounded-lg font-bold border-primary/20 text-primary hover:bg-primary/5 transition-all"
                    onClick={() => window.open('https://accounts.clerk.com/user', '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Gérer sur Clerk
                  </Button>
                </div>
                <CardDescription>Vos informations sont synchronisées avec votre compte Clerk.</CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-70">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Adresse Email</Label>
                  <Input 
                    type="email" 
                    className="h-12 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 text-sm px-4 cursor-not-allowed"
                    value={email}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nom Complet</Label>
                  <Input 
                    type="text" 
                    className="h-12 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 text-sm px-4 cursor-not-allowed"
                    value={name}
                    readOnly
                  />
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-500 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Les modifications du profil et du mot de passe doivent être effectuées sur Clerk pour des raisons de sécurité.
              </div>
            </CardContent>
          </Card>

          {/* Local Settings (Optional) */}
          <Card className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-lg overflow-hidden">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-primary/5 flex flex-row items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Compléments de Profil</CardTitle>
                <CardDescription>Informations locales spécifiques à Whappi.</CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8">
              <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Numéro de Téléphone</Label>
                    <Input 
                      type="tel" 
                      placeholder="+33 6 00 00 00 00" 
                      className="h-12 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus-visible:ring-primary/20 transition-all duration-200 text-sm px-4"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Localisation</Label>
                    <Input 
                      type="text" 
                      placeholder="Paris, France" 
                      className="h-12 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus-visible:ring-primary/20 transition-all duration-200 text-sm px-4"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Bio / Présentation</Label>
                  <Textarea 
                    placeholder="Parlez-nous de vous..." 
                    className="min-h-[100px] rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus-visible:ring-primary/20 transition-all duration-200 text-sm p-4 resize-none"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={updating || !hasProfileChanges()}
                    className="h-12 px-8 rounded-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
                  >
                    {updating ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Mettre à jour Whappi
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* New Management Section */}
        <div className="space-y-8">
          <Card className="rounded-lg border border-slate-200 dark:border-primary/10 shadow-lg overflow-hidden">
            <CardHeader className="p-6 sm:p-8 border-b border-slate-100 dark:border-primary/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">Gestion du Compte</CardTitle>
                    <CardDescription>Déconnectez-vous ou gérez la suppression de votre compte.</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 space-y-8">
              {/* Logout and Developer Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <Button 
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="h-12 px-6 rounded-lg font-bold border-slate-200 dark:border-primary/10 hover:bg-slate-50 dark:hover:bg-primary/5 transition-all duration-200"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <LogOut className="w-4 h-4 mr-2" />
                  )}
                  Déconnecter
                </Button>

                <Link href="/docs">
                   <Button 
                     variant="ghost"
                     className="h-12 px-6 rounded-lg font-bold text-slate-500 hover:text-primary transition-all duration-200"
                   >
                     <Code2 className="w-4 h-4 mr-2" />
                     Documentation API
                   </Button>
                 </Link>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-rose-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Zone de Danger
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                      Une fois supprimé, votre compte et toutes ses données associées (sessions, logs, campagnes) seront définitivement effacés.
                    </p>
                  </div>
                  
                  <Button 
                    variant="ghost"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-12 px-6 rounded-lg font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 transition-all duration-200 group"
                  >
                    <Trash2 className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
                    Supprimer mon compte
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-900 dark:text-white">
              Suppression Définitive
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est <span className="text-rose-600 font-bold">irréversible</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Tapez <span className="text-slate-900 dark:text-white">SUPPRIMER</span> pour confirmer
              </Label>
              <Input 
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="SUPPRIMER"
                className="h-12 rounded-lg bg-slate-50 dark:bg-background/50 border-slate-200 dark:border-primary/10 focus-visible:ring-rose-500/20 text-center font-bold tracking-widest"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation("")
              }}
              className="flex-1 h-12 font-bold rounded-lg border-slate-200 dark:border-primary/10"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "SUPPRIMER" || isDeletingAccount}
              className="flex-1 h-12 font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all duration-200"
            >
              {isDeletingAccount ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
