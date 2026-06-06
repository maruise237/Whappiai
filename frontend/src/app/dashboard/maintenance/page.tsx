"use client"

import * as React from "react"
import { useAuth } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Wrench,
  Clock,
  ShieldOff,
  Play,
  Square,
  Save,
  CalendarClock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/api"

type MaintenanceSettings = {
  enabled: number
  title: string
  message: string
  icon: string
  scheduled_start_at: string | null
  scheduled_end_at: string | null
  updated_at?: string
  updated_by?: string
}

const ICON_OPTIONS = ["Wrench", "ShieldOff", "Timer", "Clock", "AlertTriangle"]

export default function MaintenancePage() {
  const { getToken, userId } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [settings, setSettings] = React.useState<MaintenanceSettings>({
    enabled: 0,
    title: "Maintenance en cours",
    message: "Nous effectuons des ameliorations techniques. Revenez dans quelques instants.",
    icon: "Wrench",
    scheduled_start_at: null,
    scheduled_end_at: null,
  })

  const fetchSettings = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.admin.getMaintenance(token || undefined) as MaintenanceSettings
      if (data) setSettings(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    if (userId) fetchSettings()
  }, [fetchSettings, userId])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      await api.admin.updateMaintenance({
        enabled: settings.enabled === 1,
        title: settings.title,
        message: settings.message,
        icon: settings.icon,
        scheduled_start_at: settings.scheduled_start_at || null,
        scheduled_end_at: settings.scheduled_end_at || null,
      }, token || undefined)
      toast.success("Parametres de maintenance enregistres")
      fetchSettings()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const activateNow = async () => {
    try {
      const token = await getToken()
      await api.admin.activateMaintenance(token || undefined)
      toast.success("Mode maintenance active")
      fetchSettings()
    } catch (err: any) {
      toast.error(err.message || "Erreur d'activation")
    }
  }

  const deactivateNow = async () => {
    try {
      const token = await getToken()
      await api.admin.deactivateMaintenance(token || undefined)
      toast.success("Mode maintenance desactive")
      fetchSettings()
    } catch (err: any) {
      toast.error(err.message || "Erreur de desactivation")
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[50dvh] place-items-center text-sm text-muted-foreground">
        Chargement...
      </div>
    )
  }

  const isActive = settings.enabled === 1
  const hasSchedule = settings.scheduled_start_at && settings.scheduled_end_at
  const scheduleStart = settings.scheduled_start_at
    ? settings.scheduled_start_at.slice(0, 16)
    : ""
  const scheduleEnd = settings.scheduled_end_at
    ? settings.scheduled_end_at.slice(0, 16)
    : ""

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mode Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activez une page de maintenance pour les utilisateurs du dashboard.
          </p>
        </div>
        <Badge variant={isActive ? "destructive" : "secondary"} className="gap-2">
          <span className={`h-2 w-2 rounded-full ${isActive ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
          {isActive ? "Actif" : "Inactif"}
        </Badge>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        {isActive ? (
          <Button variant="destructive" onClick={deactivateNow}>
            <ShieldOff className="mr-2 h-4 w-4" />
            Desactiver maintenant
          </Button>
        ) : (
          <Button onClick={activateNow}>
            <Play className="mr-2 h-4 w-4" />
            Activer maintenant
          </Button>
        )}
      </div>

      {/* Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Personnalisation
          </CardTitle>
          <CardDescription>
            Modifiez le titre, le message et l'icone affiches pendant la maintenance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={settings.title}
                onChange={e => setSettings(p => ({ ...p, title: e.target.value }))}
                placeholder="Maintenance en cours"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icône</Label>
              <Select
                value={settings.icon}
                onValueChange={v => setSettings(p => ({ ...p, icon: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={settings.message}
              onChange={e => setSettings(p => ({ ...p, message: e.target.value }))}
              placeholder="Nous effectuons des ameliorations..."
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </CardFooter>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Programmation
          </CardTitle>
          <CardDescription>
            Planifiez une fenetre de maintenance. La fonction s'activera et se desactivera automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Debut programme</Label>
              <Input
                id="start"
                type="datetime-local"
                value={scheduleStart}
                onChange={e => setSettings(p => ({ ...p, scheduled_start_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fin programmee</Label>
              <Input
                id="end"
                type="datetime-local"
                value={scheduleEnd}
                onChange={e => setSettings(p => ({ ...p, scheduled_end_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>
          </div>
          {hasSchedule && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary">
              <Clock className="h-3 w-3" />
              Activation automatique programmee
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/20">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer la programmation
          </Button>
        </CardFooter>
      </Card>

      {/* Preview */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            Apercu de la page de maintenance
          </CardTitle>
          <CardDescription>
            Voici ce que verront les utilisateurs du dashboard si le mode est actif.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border bg-muted/30 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Wrench className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{settings.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{settings.message}</p>
            {scheduleEnd && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Retour prevu vers {new Date(settings.scheduled_end_at!).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-muted-foreground">
        La page de maintenance s'affiche UNIQUEMENT sur le dashboard, jamais sur la landing page ou les pages publiques.
      </p>
    </div>
  )
}
