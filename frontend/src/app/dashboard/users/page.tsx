"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react"
import {
  CheckCircle2,
  Clock3,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Shield,
  Smartphone,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/clerk-react"
import { toast } from "sonner"
import { cn, ensureString, safeDate, safeRender } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const planDefaults: Record<string, { label: string; actions: number }> = {
  starter: { label: "Starter", actions: 1000 },
  pro: { label: "Pro", actions: 5000 },
  business: { label: "Organisation", actions: 25000 },
}

export default function UsersPage() {
  const { getToken } = useAuth()
  const { user: currentUser } = useUser()
  const [users, setUsers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [userDetails, setUserDetails] = React.useState<any>(null)
  const [isDetailsLoading, setIsDetailsLoading] = React.useState(false)

  const [formData, setFormData] = React.useState({ email: "", role: "user" })
  const [subscriptionForm, setSubscriptionForm] = React.useState({
    planCode: "pro",
    messageLimit: planDefaults.pro.actions,
    durationDays: 30,
  })

  const isAdmin = currentUser?.primaryEmailAddress?.emailAddress === "maruise237@gmail.com" || currentUser?.publicMetadata?.role === "admin"

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.users.list(token || undefined)
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement des utilisateurs")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const fetchUserDetails = React.useCallback(async (userId: string) => {
    setIsDetailsLoading(true)
    try {
      const token = await getToken()
      const data = await api.admin.getUserDetails(userId, token || undefined)
      setUserDetails(data)
      const planCode = ensureString(data?.user?.plan_id || data?.user?.plan || "pro")
      const normalizedPlan = planDefaults[planCode] ? planCode : "pro"
      setSubscriptionForm({
        planCode: normalizedPlan,
        messageLimit: Number(data?.user?.message_limit || planDefaults[normalizedPlan].actions),
        durationDays: 30,
      })
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement des details")
    } finally {
      setIsDetailsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchUsers().catch(console.error)
  }, [fetchUsers])

  React.useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId)
    } else {
      setUserDetails(null)
    }
  }, [selectedUserId, fetchUserDetails])

  const filtered = users.filter(user =>
    ensureString(user.email).toLowerCase().includes(searchQuery.toLowerCase()) ||
    ensureString(user.id).toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateUser = async () => {
    if (!formData.email) return toast.error("Email requis")
    setIsSubmitting(true)
    try {
      const token = await getToken()
      await api.users.create(formData, token || undefined)
      toast.success("Utilisateur invite")
      setIsAddDialogOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la creation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRole = async (email: string, newRole: string) => {
    try {
      const token = await getToken()
      await api.users.update(email, { role: newRole }, token || undefined)
      toast.success("Role mis a jour")
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise a jour")
    }
  }

  const handleToggleStatus = async (user: any) => {
    try {
      const token = await getToken()
      await api.users.update(user.email, { is_active: !user.is_active }, token || undefined)
      toast.success(user.is_active ? "Compte desactive" : "Compte reactive")
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Erreur de statut")
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Supprimer definitivement cet utilisateur ?")) return
    try {
      const token = await getToken()
      await api.users.delete(id, token || undefined)
      toast.success("Utilisateur supprime")
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Erreur de suppression")
    }
  }

  const handleActivateSubscription = async () => {
    if (!selectedUserId) return
    setIsSubmitting(true)
    try {
      const token = await getToken()
      await api.admin.updateSubscription(selectedUserId, subscriptionForm, token || undefined)
      toast.success("Abonnement active manuellement")
      fetchUserDetails(selectedUserId)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Erreur abonnement")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExpireSubscription = async () => {
    if (!selectedUserId) return
    setIsSubmitting(true)
    try {
      const token = await getToken()
      await api.admin.updateSubscription(selectedUserId, { action: "expire" }, token || undefined)
      toast.success("Abonnement expire")
      fetchUserDetails(selectedUserId)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Erreur abonnement")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <h2 className="text-lg font-bold">Acces restreint</h2>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">Seuls les administrateurs peuvent gerer les comptes.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Users className="h-5 w-5 text-primary" /> Admin comptes
          </h1>
          <p className="text-sm text-muted-foreground">Gerez les acces, les abonnements et les volumes d&apos;actions Whappi.</p>
        </div>

        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="h-8 rounded-full px-4">
          <Plus className="mr-2 h-3 w-3" /> Nouvel utilisateur
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email ou ID..."
            className="h-9 pl-8 text-xs"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
        </div>
        <Badge variant="outline" className="h-9 rounded-md border-dashed px-3 text-[10px] font-semibold tracking-wider text-muted-foreground">
          {filtered.length} comptes
        </Badge>
      </div>

      <Card className="overflow-hidden bg-card shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold text-muted-foreground">Utilisateur</TableHead>
                <TableHead className="hidden text-[10px] font-semibold text-muted-foreground sm:table-cell">Role</TableHead>
                <TableHead className="text-[10px] font-semibold text-muted-foreground">Abonnement</TableHead>
                <TableHead className="hidden text-[10px] font-semibold text-muted-foreground md:table-cell">Actions restantes</TableHead>
                <TableHead className="hidden text-[10px] font-semibold text-muted-foreground md:table-cell">Statut</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index} className="animate-pulse">
                    <TableCell colSpan={6} className="h-14 bg-muted/5" />
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Aucun utilisateur trouve.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(user => (
                  <TableRow key={ensureString(user.id || user.email)} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelectedUserId(user.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {ensureString(user.email, "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-semibold">{safeRender(user.email)}</span>
                          <span className="truncate font-mono text-[9px] uppercase text-muted-foreground/70">{safeRender(user.id)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className={cn("text-[9px] font-semibold", user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {safeRender(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold">{planLabel(user.plan_id)}</span>
                        <span className="text-[10px] text-muted-foreground">{safeRender(user.plan_status || "trial")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs font-semibold">{safeRender(user.message_limit || 0)}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {user.is_active ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <XCircle className="h-3 w-3 text-muted-foreground/40" />}
                        <span className="text-[11px] font-medium">{user.is_active ? "Actif" : "Desactive"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={event => event.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-xs" onClick={() => setSelectedUserId(user.id)}>
                            <UserCog className="mr-2 h-3.5 w-3.5" /> Gerer abonnement
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs" onClick={() => handleUpdateRole(user.email, user.role === "admin" ? "user" : "admin")}>
                            <Shield className="mr-2 h-3.5 w-3.5" /> Passer en {user.role === "admin" ? "utilisateur" : "admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs" onClick={() => handleToggleStatus(user)}>
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> {user.is_active ? "Desactiver" : "Reactiver"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs text-destructive" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={!!selectedUserId} onOpenChange={open => !open && setSelectedUserId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-[620px]">
          <SheetHeader className="pb-6">
            <SheetTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {ensureString(userDetails?.user?.email, "?").charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-base font-bold">{safeRender(userDetails?.user?.email)}</p>
                <Badge variant="outline" className="text-[9px] uppercase tracking-widest">{planLabel(userDetails?.user?.plan_id)}</Badge>
              </div>
            </SheetTitle>
            <SheetDescription className="text-xs">
              Activez un forfait, ajustez le volume mensuel et surveillez les sessions du compte.
            </SheetDescription>
          </SheetHeader>

          {isDetailsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
              <p className="text-xs text-muted-foreground">Chargement du compte...</p>
            </div>
          ) : (
            <Tabs defaultValue="subscription" className="space-y-6">
              <TabsList className="grid h-9 w-full grid-cols-3">
                <TabsTrigger value="subscription" className="text-[10px] font-bold">Abonnement</TabsTrigger>
                <TabsTrigger value="sessions" className="text-[10px] font-bold">Sessions</TabsTrigger>
                <TabsTrigger value="activity" className="text-[10px] font-bold">Activite</TabsTrigger>
              </TabsList>

              <TabsContent value="subscription" className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Plan actuel" value={planLabel(userDetails?.user?.plan_id)} />
                  <Metric label="Actions restantes" value={safeRender(userDetails?.user?.message_limit || 0)} />
                  <Metric label="Actions utilisees" value={safeRender(userDetails?.user?.message_used || 0)} />
                  <Metric label="Expiration" value={safeDate(userDetails?.user?.subscription_expiry)} />
                </div>

                <Card className="border-primary/20 bg-primary/5 shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div>
                      <p className="text-sm font-semibold">Activation manuelle</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Pour un paiement hors ligne, une faveur commerciale ou un compte partenaire.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px]">Forfait</Label>
                        <Select
                          value={subscriptionForm.planCode}
                          onValueChange={value => setSubscriptionForm({
                            ...subscriptionForm,
                            planCode: value,
                            messageLimit: planDefaults[value]?.actions || subscriptionForm.messageLimit,
                          })}
                        >
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(planDefaults).map(([code, plan]) => (
                              <SelectItem key={code} value={code}>{plan.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px]">Actions / mois</Label>
                        <Input
                          type="number"
                          className="h-9 text-xs"
                          value={subscriptionForm.messageLimit}
                          onChange={event => setSubscriptionForm({ ...subscriptionForm, messageLimit: Number(event.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px]">Duree</Label>
                        <Input
                          type="number"
                          className="h-9 text-xs"
                          value={subscriptionForm.durationDays}
                          onChange={event => setSubscriptionForm({ ...subscriptionForm, durationDays: Number(event.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button size="sm" onClick={handleActivateSubscription} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-2 h-3 w-3" />}
                        Activer manuellement
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExpireSubscription} disabled={isSubmitting}>
                        <XCircle className="mr-2 h-3 w-3" />
                        Expirer le forfait
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-3">
                {Array.isArray(userDetails?.sessions) && userDetails.sessions.length > 0 ? userDetails.sessions.map((session: any) => (
                  <div key={ensureString(session.id)} className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{safeRender(session.id)}</p>
                      <p className="text-[10px] text-muted-foreground">{safeRender(session.status)}</p>
                    </div>
                    <Badge className={cn("border-none text-[9px]", session.status === "CONNECTED" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                      {session.status === "CONNECTED" ? "Live" : "Off"}
                    </Badge>
                  </div>
                )) : (
                  <p className="rounded-lg border-2 border-dashed bg-muted/5 py-8 text-center text-xs text-muted-foreground">
                    Aucune session active.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-3">
                {Array.isArray(userDetails?.logs) && userDetails.logs.length > 0 ? userDetails.logs.slice(0, 20).map((log: any) => (
                  <div key={ensureString(log.id || log.timestamp)} className="flex items-start gap-3 rounded-lg border bg-muted/5 p-3">
                    <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", log.status === "success" ? "bg-primary" : "bg-destructive")} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider">{safeRender(log.action)}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{safeRender(log.details)}</p>
                      <p className="mt-1 text-[9px] text-muted-foreground/70">{safeDate(log.timestamp)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-lg border-2 border-dashed bg-muted/5 py-8 text-center text-xs text-muted-foreground">
                    Aucune activite recente.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">Ajouter un utilisateur</DialogTitle>
            <DialogDescription className="text-xs">Creez manuellement un acces pour un nouveau membre.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground">Email</Label>
              <Input
                placeholder="user@example.com"
                className="h-9"
                value={formData.email}
                onChange={event => setFormData({ ...formData, email: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground">Role initial</Label>
              <Select value={formData.role} onValueChange={value => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:flex-row">
            <Button variant="ghost" size="sm" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleCreateUser} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              Lancer l&apos;invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function planLabel(planId?: unknown) {
  const value = ensureString(planId || "trial")
  if (value.includes("starter")) return "Starter"
  if (value.includes("pro")) return "Pro"
  if (value.includes("business")) return "Organisation"
  if (value.includes("trial")) return "Essai"
  if (value.includes("free")) return "Gratuit"
  return value
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-muted/10 shadow-none">
      <CardContent className="p-3">
        <p className="mb-1 text-[9px] font-bold uppercase text-muted-foreground">{label}</p>
        <p className="flex items-center gap-1 text-sm font-bold">
          {label.includes("Expiration") ? <Clock3 className="h-3.5 w-3.5 text-primary" /> : <Smartphone className="h-3.5 w-3.5 text-primary" />}
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
