"use client"

import * as React from "react"
import { AlertCircle, ExternalLink, Lock, LogOut, User } from "lucide-react"
import { useAuth, useClerk, useUser } from "@clerk/clerk-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { ensureString } from "@/lib/utils"

type DbUserProfile = {
  organization_name?: string | null
  timezone?: string | null
  sound_notifications?: number | boolean | null
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const { signOut } = useClerk()
  const [dbUser, setDbUser] = React.useState<DbUserProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [organisation, setOrganisation] = React.useState("")
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [confirmEmail, setConfirmEmail] = React.useState("")

  const fetchDbUser = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.auth.check(token || undefined)
      const nextUser = data?.user || data
      setDbUser(nextUser)
      setOrganisation(ensureString(nextUser?.organization_name))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchDbUser()
  }, [fetchDbUser])

  if (!isLoaded) return null

  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const isAdmin = userEmail === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"
  const userRole = isAdmin ? "Administrateur" : ((user?.publicMetadata?.role as string) || "Utilisateur")
  const hasProfileChanges = organisation !== ensureString(dbUser?.organization_name)

  async function handleSaveProfile() {
    try {
      setSavingProfile(true)
      const token = await getToken()
      await api.users.updateProfile({ organization_name: organisation }, token || undefined)
      setDbUser({ ...dbUser, organization_name: organisation })
      toast.success("Profil mis a jour")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de mettre a jour le profil")
    } finally {
      setSavingProfile(false)
    }
  }

  function handleDeleteAccount() {
    toast.info("Demande de suppression recue. Le traitement definitif doit etre raccorde cote serveur.")
    setDeleteDialogOpen(false)
    setConfirmEmail("")
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <div className="h-20 w-20 shrink-0 rounded-full border-2 border-primary/20 bg-background p-1 shadow-sm">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-muted">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground/30" />
            )}
          </div>
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{user?.fullName || userEmail.split("@")[0]}</h1>
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Badge variant="outline" className="text-[10px] font-semibold tracking-widest text-muted-foreground">
              {userRole}
            </Badge>
            <span className="w-full truncate text-xs text-muted-foreground sm:w-auto">{userEmail}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[250px_1fr]">
        <nav className="sticky top-14 z-10 flex h-fit flex-row gap-1 overflow-x-auto border-b bg-background/95 py-2 backdrop-blur md:top-24 md:flex-col md:border-none md:py-0">
          <Button variant="ghost" className="h-10 flex-none justify-start rounded-none border-b-2 border-primary bg-muted/50 px-4 text-xs font-semibold tracking-wider whitespace-nowrap md:border-b-0 md:border-r-2">
            Mon Profil
          </Button>
          <Button variant="ghost" className="h-10 flex-none justify-start px-4 text-xs font-semibold tracking-wider text-muted-foreground whitespace-nowrap hover:bg-muted/30">
            Securite
          </Button>
          <Button variant="ghost" className="h-10 flex-none justify-start px-4 text-xs font-semibold tracking-wider text-muted-foreground whitespace-nowrap hover:bg-muted/30">
            Notifications
          </Button>
          <Separator className="my-2 hidden md:block" />
          <div className="md:pt-2">
            <Button
              variant="ghost"
              onClick={() => signOut({ redirectUrl: "/login" })}
              className="h-10 flex-none justify-start px-4 text-xs font-semibold tracking-wider text-destructive whitespace-nowrap hover:bg-destructive/5 hover:text-destructive"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" /> Se deconnecter
            </Button>
          </div>
        </nav>

        <div className="space-y-6">
          <Card className="border-none bg-muted/20 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Informations de Compte</CardTitle>
              <CardDescription className="text-xs">
                Les champs Clerk sont verrouilles ici. L&apos;organisation reste modifiable dans Whappi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Nom Prenom" value={user?.fullName || ""} source="Clerk" />
                <ReadOnlyField label="Email Principal" value={userEmail} source="Clerk" />

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground">Organisation</Label>
                  <Input
                    value={organisation}
                    onChange={event => setOrganisation(event.target.value)}
                    placeholder="Ex: KAMTECH, Reseau Tontine Yaounde..."
                    className="h-9 text-xs focus-visible:ring-primary/30"
                    disabled={loading}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Utilise pour personnaliser vos messages automatiques.
                  </p>
                </div>

                <ReadOnlyField label="Fuseau Horaire" value={dbUser?.timezone || "UTC"} source="Systeme" />
              </div>

              {hasProfileChanges && (
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Notifications Sonores</p>
                  <p className="text-[10px] text-muted-foreground">Jouer un son lors d&apos;un nouvel evenement.</p>
                </div>
                <Switch
                  checked={!!dbUser?.sound_notifications}
                  onCheckedChange={async val => {
                    try {
                      const token = await getToken()
                      await api.users.updateProfile({ sound_notifications: val ? 1 : 0 }, token || undefined)
                      setDbUser({ ...dbUser, sound_notifications: val ? 1 : 0 })
                      toast.success("Reglage mis a jour")
                    } catch (error) {
                      console.error(error)
                      toast.error("Erreur de mise a jour")
                    }
                  }}
                />
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-primary">Gestion via Clerk</p>
                  <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                    Vos parametres de securite, changement de mot de passe et authentification 2FA sont geres par Clerk.
                  </p>
                  <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-bold" asChild>
                    <a href="https://accounts.clerk.dev" target="_blank" rel="noreferrer" className="flex items-center gap-1">
                      Acceder au centre de securite <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-muted/20 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold tracking-tight">Activite & Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <ProfileMetric
                  label="Derniere Connexion"
                  value={user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Maintenant"}
                />
                <ProfileMetric
                  label="Anciennete"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                />
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <h4 className="mb-2 text-xs font-semibold text-destructive">Zone de Danger</h4>
            <p className="mb-4 text-xs text-muted-foreground">
              La suppression de votre compte est irreversible et effacera toutes vos sessions WhatsApp ainsi que vos historiques IA.
            </p>
            <Button
              variant="outline"
              className="rounded-full border-destructive/50 px-6 text-xs text-destructive hover:bg-destructive hover:text-white"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Supprimer mon compte definitivement
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Supprimer votre compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. Toutes vos sessions WhatsApp, groupes configures et historiques seront definitivement effaces.
              <br /><br />
              Pour confirmer, tapez votre adresse email : <strong>{userEmail}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmEmail}
            onChange={event => setConfirmEmail(event.target.value)}
            placeholder={userEmail || "email@exemple.com"}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmEmail("")}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmEmail !== userEmail}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40"
              onClick={handleDeleteAccount}
            >
              Supprimer definitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ReadOnlyField({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input value={value} disabled className="h-9 bg-muted/50 text-xs text-muted-foreground" />
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground">
          <Lock className="h-3 w-3" /> {source}
        </span>
      </div>
    </div>
  )
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/50 bg-background/50 p-4">
      <p className="mb-1 text-[9px] font-semibold tracking-widest text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold">{value}</p>
    </div>
  )
}
