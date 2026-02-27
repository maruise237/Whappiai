"use client"

import * as React from "react"
import {
  Wand2,
  ArrowRight,
  ArrowLeft,
  Check,
  Link as LinkIcon,
  Video,
  Calendar,
  Loader2,
  PartyPopper,
  Plus,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

type Step = 1 | 2 | 3 | 4 | 5 | 6

export function MagicOnboardingWizard({
  sessionId,
  onComplete,
  defaultOpen = false
}: {
  sessionId: string,
  onComplete: () => void,
  defaultOpen?: boolean
}) {
  const { getToken } = useAuth()
  const [open, setOpen] = React.useState(defaultOpen)
  const [step, setStep] = React.useState<Step>(defaultOpen ? 4 : 1)
  const [loading, setLoading] = React.useState(false)
  const [calStatus, setCalStatus] = React.useState<any>(null)

  // Form State
  const [assistantName, setAssistantName] = React.useState("")
  const [role, setRole] = React.useState("")
  const [activities, setActivities] = React.useState("")
  const [links, setLinks] = React.useState<{ title: string, url: string }[]>([])
  const [calEnabled, setCalEnabled] = React.useState(false)
  const [videoEnabled, setVideoEnabled] = React.useState(false)

  const fetchCalStatus = async () => {
    try {
      const token = await getToken()
      const status = await api.cal.getStatus(token || undefined)
      setCalStatus(status)
      if (status?.isConnected) {
        setCalEnabled(status.ai_cal_enabled)
        setVideoEnabled(status.ai_cal_video_allowed)
      }
    } catch (e) {}
  }

  React.useEffect(() => {
    if (open) fetchCalStatus()
  }, [open])

  const handleNext = () => setStep((prev) => (prev + 1) as Step)
  const handleBack = () => setStep((prev) => (prev - 1) as Step)

  const addLink = () => setLinks([...links, { title: "", url: "" }])
  const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index))
  const updateLink = (index: number, field: "title" | "url", value: string) => {
    const newLinks = [...links]
    newLinks[index][field] = value
    setLinks(newLinks)
  }

  const connectCal = async () => {
    try {
      const token = await getToken()
      const { authUrl } = await api.cal.getAuthUrl(token || undefined)
      window.location.href = authUrl
    } catch (e) {
      toast.error("Erreur lors de la connexion à Cal.com")
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const token = await getToken()

      // 1. Generate Config
      const config = await api.ai.generateOnboarding({
        assistantName,
        role,
        activities,
        links,
        calEnabled,
        videoEnabled
      }, token || undefined)

      // 2. Update Session AI
      await api.sessions.updateAI(sessionId, {
        enabled: true,
        prompt: config.prompt,
        constraints: config.constraints,
        model: config.model,
        mode: 'bot'
      }, token || undefined)

      // 3. Update Cal Settings if changed
      if (calStatus?.isConnected) {
        await api.cal.updateSettings({
          ai_cal_enabled: calEnabled,
          ai_cal_video_allowed: videoEnabled
        }, token || undefined)
      }

      setStep(6)
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la configuration")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/5">
          <Wand2 className="h-4 w-4" /> Configuration Magique
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary p-6 text-primary-foreground">
           <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {step < 6 ? <Wand2 className="h-5 w-5" /> : <PartyPopper className="h-5 w-5" />}
              {step === 1 && "Nommez votre assistant"}
              {step === 2 && "Définissez son rôle"}
              {step === 3 && "Vos ressources (Optionnel)"}
              {step === 4 && "Prise de rendez-vous"}
              {step === 5 && "Finalisation"}
              {step === 6 && "Félicitations !"}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-xs">
              {step < 6 ? `Étape ${step} sur 5` : "Configuration terminée avec succès"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 min-h-[300px] flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-2">
                <Label>Comment s&apos;appelle votre assistant ?</Label>
                <Input
                  placeholder="Ex: Sarah, Assistant Whappi..."
                  value={assistantName}
                  onChange={e => setAssistantName(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Ce nom sera utilisé par l&apos;IA pour se présenter à vos clients.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <Label>Quel est son rôle exact ?</Label>
                <Textarea
                  placeholder="Ex: Support client pour une agence immobilière, chargé de répondre aux questions sur les annonces..."
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Décrivez vos activités principales</Label>
                <Textarea
                  placeholder="Ex: Vente et location d'appartements de luxe à Douala, conseils en investissement..."
                  value={activities}
                  onChange={e => setActivities(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 max-h-[400px] overflow-y-auto pr-2">
              <Label>Ajoutez des liens importants (Site, Catalogue, Promo...)</Label>
              {links.map((link, index) => (
                <div key={index} className="flex gap-2 items-start p-3 bg-muted/30 rounded-lg border border-muted relative group">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Titre (ex: Notre site)"
                      value={link.title}
                      onChange={e => updateLink(index, "title", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="URL (https://...)"
                      value={link.url}
                      onChange={e => updateLink(index, "url", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeLink(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addLink}>
                <Plus className="h-3 w-3 mr-2" /> Ajouter un lien
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-muted">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-bold">Prendre des rendez-vous</p>
                    <p className="text-[10px] text-muted-foreground">L&apos;IA gère votre agenda Cal.com</p>
                  </div>
                </div>
                <Switch
                  disabled={!calStatus?.isConnected}
                  checked={calEnabled}
                  onCheckedChange={setCalEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-muted">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><Video className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-bold">Appels Vidéo</p>
                    <p className="text-[10px] text-muted-foreground">Accepter les réservations en vidéo</p>
                  </div>
                </div>
                <Switch
                  disabled={!calStatus?.isConnected}
                  checked={videoEnabled}
                  onCheckedChange={setVideoEnabled}
                />
              </div>

              {!calStatus?.isConnected && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg text-center space-y-3">
                  <p className="text-xs text-amber-600 font-medium italic">Connectez votre compte Cal.com pour activer ces options</p>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-2" onClick={connectCal}>
                    <Calendar className="h-3 w-3" /> Connecter Cal.com
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 text-center py-8 animate-in zoom-in-95 duration-300">
               <div className="relative mx-auto w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-xl">
                     <Check className="h-10 w-10" />
                  </div>
               </div>
               <div className="space-y-2">
                 <h3 className="font-bold text-lg">Prêt à lancer la magie ?</h3>
                 <p className="text-xs text-muted-foreground px-4">Notre IA va maintenant analyser vos réponses pour créer la configuration parfaite pour {assistantName}.</p>
               </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 text-center py-8 animate-in zoom-in-95 duration-500">
               <div className="text-6xl mb-4">🎉</div>
               <div className="space-y-2">
                 <h3 className="font-bold text-2xl text-primary">Félicitations !</h3>
                 <p className="text-sm font-medium">Vous venez de vous réduire <span className="text-primary font-bold text-lg">60 heures</span> de travail mensuel.</p>
                 <p className="text-xs text-muted-foreground pt-4 italic">Votre assistant est maintenant configuré et prêt à l&apos;action sur WhatsApp.</p>
               </div>
               <Button className="w-full mt-6" onClick={() => { setOpen(false); onComplete(); }}>
                  Accéder à mon tableau de bord
               </Button>
            </div>
          )}
        </div>

        {step < 6 && (
          <div className="p-6 bg-muted/5 flex items-center justify-between border-t border-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Button>

            {step === 5 ? (
              <Button size="sm" className="px-8 shadow-lg shadow-primary/20" onClick={handleFinish} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Créer mon assistant
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext} disabled={loading}>
                Continuer <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
