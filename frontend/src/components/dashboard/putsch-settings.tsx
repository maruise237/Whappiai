"use client"

import * as React from "react"
import { Bell, Volume2, VolumeX, Shield, Settings, Sliders, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { putsch } from "@/lib/putsch-adapter"
import { runPutschTests } from "@/lib/putsch-tests"
import { PutschPreferences, NotificationPriority } from "@/lib/putsch-types"
import { toast } from "sonner"

export function PutschSettings() {
  const [prefs, setPrefs] = React.useState<PutschPreferences | null>(null)

  React.useEffect(() => {
    setPrefs(putsch.getPreferences())
  }, [])

  if (!prefs) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const handleToggle = (key: keyof PutschPreferences) => {
    const newValue = !prefs[key]
    const updated = { ...prefs, [key]: newValue }
    setPrefs(updated)
    putsch.updatePreferences({ [key]: newValue })
    
    if (key === 'enabled') {
      toast.success(newValue ? "Notifications activées" : "Notifications désactivées")
    }
  }

  const handlePriorityToggle = (priority: NotificationPriority) => {
    const updatedPriorities = { ...prefs.priorities, [priority]: !prefs.priorities[priority] }
    const updated = { ...prefs, priorities: updatedPriorities }
    setPrefs(updated)
    putsch.updatePreferences({ priorities: updatedPriorities })
  }

  const handleVolumeChange = (value: number[]) => {
    const volume = value[0] / 100
    const updated = { ...prefs, soundVolume: volume }
    setPrefs(updated)
    putsch.updatePreferences({ soundVolume: volume })
  }

  const testNotification = (mode: 'sound' | 'silent') => {
    const originalSound = prefs.soundEnabled
    
    if (mode === 'silent') {
      putsch.updatePreferences({ soundEnabled: false })
    } else {
      putsch.updatePreferences({ soundEnabled: true })
    }

    putsch.notify({
      title: mode === 'sound' ? "Test Sonore" : "Test Silencieux",
      message: `Ceci est une notification PUTSCH en mode ${mode}.`,
      priority: 'medium'
    })

    // Restaurer après un court délai
    setTimeout(() => {
      putsch.updatePreferences({ soundEnabled: originalSound })
    }, 1000)
  }

  const runTests = async () => {
    toast.promise(runPutschTests(), {
      loading: 'Exécution des tests unitaires...',
      success: (data) => `Tests terminés : ${data.passed}/${data.total} réussis`,
      error: 'Erreur lors de l\'exécution des tests'
    })
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="border-primary/10 shadow-lg overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Système PUTSCH
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de notifications locales et autonomes.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={runTests}
                title="Exécuter les tests unitaires"
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              <Switch 
                checked={prefs.enabled}
                onCheckedChange={() => handleToggle('enabled')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Audio Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {prefs.soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="space-y-0.5">
                  <Label className="font-bold">Notifications Sonores</Label>
                  <p className="text-xs text-muted-foreground">Activer le retour audio pour les alertes.</p>
                </div>
              </div>
              <Switch 
                disabled={!prefs.enabled}
                checked={prefs.soundEnabled}
                onCheckedChange={() => handleToggle('soundEnabled')}
              />
            </div>

            {prefs.soundEnabled && (
              <div className="pl-12 space-y-3">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="text-primary font-bold">{Math.round(prefs.soundVolume * 100)}%</span>
                </div>
                <Slider 
                  disabled={!prefs.enabled}
                  value={[prefs.soundVolume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Priority Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sliders className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <Label className="font-bold">Filtres de Priorité</Label>
                <p className="text-xs text-muted-foreground">Sélectionnez les niveaux d'alerte à afficher.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pl-12">
              {(['low', 'medium', 'high', 'critical'] as NotificationPriority[]).map((p) => (
                <div key={p} className="flex items-center justify-between p-2 border rounded-lg bg-slate-50 dark:bg-muted/30">
                  <Badge variant="outline" className="capitalize text-[10px]">{p}</Badge>
                  <Switch 
                    disabled={!prefs.enabled}
                    checked={prefs.priorities[p]}
                    onCheckedChange={() => handlePriorityToggle(p)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Test Controls */}
          <div className="pt-6 border-t flex flex-col sm:flex-row gap-3">
            <Button 
              disabled={!prefs.enabled}
              variant="outline" 
              className="flex-1 gap-2 font-bold uppercase tracking-widest text-[10px]"
              onClick={() => testNotification('silent')}
            >
              <VolumeX className="w-3 h-3" />
              Test Silencieux
            </Button>
            <Button 
              disabled={!prefs.enabled}
              className="flex-1 gap-2 font-bold uppercase tracking-widest text-[10px]"
              onClick={() => testNotification('sound')}
            >
              <Volume2 className="w-3 h-3" />
              Test Sonore
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
