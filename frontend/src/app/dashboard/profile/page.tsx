"use client"

import * as React from "react"
import {
  User,
  Mail,
  Shield,
  Key,
  LogOut,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useUser, useClerk, useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const [dbUser, setDbUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchDbUser = React.useCallback(async () => {
     try {
        const token = await getToken()
        const data = await api.auth.check(token || undefined)
        setDbUser(data?.user || data)
     } catch (e) {} finally { setLoading(false) }
  }, [getToken])

  React.useEffect(() => {
     fetchDbUser()
  }, [fetchDbUser])

  if (!isLoaded) return null

  const userEmail = user?.primaryEmailAddress?.emailAddress
  const userRole = (user?.publicMetadata?.role as string) || "Utilisateur"

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-full border-2 border-primary/20 p-1 bg-background shadow-sm">
           <div className="h-full w-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-muted-foreground/30" />
              )}
           </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{user?.fullName || userEmail?.split('@')[0]}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground tracking-widest">{userRole}</Badge>
            <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
         <nav className="flex flex-col gap-1 sticky top-24 h-fit">
            <Button variant="ghost" className="justify-start text-xs font-semibold tracking-wider h-10 bg-muted/50 border-r-2 border-primary rounded-none px-4">Mon Profil</Button>
            <Button variant="ghost" className="justify-start text-xs font-semibold tracking-wider h-10 text-muted-foreground hover:bg-muted/30 px-4">Sécurité</Button>
            <Button variant="ghost" className="justify-start text-xs font-semibold tracking-wider h-10 text-muted-foreground hover:bg-muted/30 px-4">Notifications</Button>
            <Separator className="my-2" />
            <Button variant="ghost" onClick={() => signOut()} className="justify-start text-xs font-semibold tracking-wider h-10 text-destructive hover:bg-destructive/5 hover:text-destructive px-4">
               <LogOut className="h-3.5 w-3.5 mr-2" /> Déconnexion
            </Button>
         </nav>

         <div className="space-y-6">
            <Card className="border-none shadow-none bg-muted/20">
               <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold tracking-tight">Informations de Compte</CardTitle>
                  <CardDescription className="text-xs">Vos données personnelles synchronisées via Clerk.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Nom Prénom</Label>
                        <Input value={user?.fullName || ""} readOnly className="h-9 bg-background/50 border-none text-xs" />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Email Principal</Label>
                        <Input value={userEmail || ""} readOnly className="h-9 bg-background/50 border-none text-xs" />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Organisation</Label>
                        <Input value={dbUser?.organization_name || ""} readOnly className="h-9 bg-background/50 border-none text-xs" />
                     </div>
                     <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Fuseau Horaire</Label>
                        <Input value={dbUser?.timezone || "UTC"} readOnly className="h-9 bg-background/50 border-none text-xs" />
                     </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                     <div className="space-y-0.5">
                        <p className="text-xs font-semibold">Notifications Sonores</p>
                        <p className="text-[10px] text-muted-foreground">Jouer un son lors d&apos;un nouvel événement.</p>
                     </div>
                     <Switch checked={!!dbUser?.sound_notifications} disabled />
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3 mt-4">
                     <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                     <div className="space-y-1">
                        <p className="text-[11px] font-bold text-primary">Gestion via Clerk</p>
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                           Vos paramètres de sécurité, changement de mot de passe et authentification 2FA sont gérés de manière sécurisée par notre partenaire Clerk.
                        </p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-bold" asChild>
                           <a href="https://accounts.clerk.dev" target="_blank" rel="noreferrer" className="flex items-center gap-1">
                              Accéder au centre de sécurité <ExternalLink className="h-3 w-3" />
                           </a>
                        </Button>
                     </div>
                  </div>
               </CardContent>
            </Card>

            <Card className="border-none shadow-none bg-muted/20">
               <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold tracking-tight">Activité & Usage</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                     <div className="p-4 rounded bg-background/50 border border-border/50">
                        <p className="text-[9px] font-semibold text-muted-foreground tracking-widest mb-1">Dernière Connexion</p>
                        <p className="text-xs font-semibold">{user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Maintenant'}</p>
                     </div>
                     <div className="p-4 rounded bg-background/50 border border-border/50">
                        <p className="text-[9px] font-semibold text-muted-foreground tracking-widest mb-1">Ancienneté</p>
                        <p className="text-xs font-semibold">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</p>
                     </div>
                  </div>
               </CardContent>
            </Card>

            <div className="pt-6 border-t border-dashed">
               <h4 className="text-[10px] font-semibold text-destructive  mb-3">Zone de Danger</h4>
               <p className="text-xs text-muted-foreground mb-4">La suppression de votre compte est irréversible et effacera toutes vos sessions WhatsApp ainsi que vos historiques IA.</p>
               <Button variant="outline" className="text-xs text-destructive hover:bg-destructive hover:text-white transition-all rounded-full px-6">Supprimer mon compte définitvement</Button>
            </div>
         </div>
      </div>
    </div>
  )
}
