"use client"

import * as React from "react"
import { RefreshCw, Smartphone, QrCode, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { showConfirm } from "@/lib/swal"
import { cn, copyToClipboard as copyUtil } from "@/lib/utils"
import { toast } from "sonner"
import confetti from "canvas-confetti"

export function SessionCard({ session, onRefresh, onCreate }: { session?: any, onRefresh: () => void, onCreate: () => void }) {
  const [loading, setLoading] = React.useState(false)
  const [showToken, setShowToken] = React.useState(false)
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [localQrCode, setLocalQrCode] = React.useState<string | null>(null)
  const [localPairingCode, setLocalPairingCode] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("qr")

  // Reset local state when session changes
  React.useEffect(() => {
    setLocalQrCode(null)
    setLocalPairingCode(null)
  }, [session?.sessionId])

  const handleRequestPairingCode = async () => {
    if (!phoneNumber) {
      toast.error("Veuillez saisir un numéro de téléphone")
      return
    }

    setLoading(true)
    const toastId = toast.loading("Génération du code d'appairage...")

    try {
      let response;
      if (!session) {
        const newSessionId = `session_${Math.random().toString(36).substring(2, 9)}`
        response = await api.sessions.create(newSessionId, phoneNumber)
        onRefresh()
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      } else {
        response = await api.sessions.create(session.sessionId, phoneNumber)
        onRefresh()
      }

      if (response && response.pairingCode) {
        setLocalPairingCode(response.pairingCode)
        toast.success("Code d'appairage reçu", { id: toastId })
      } else {
        toast.success("Demande envoyée, attendez le code...", { id: toastId })
      }
    } catch (error: any) {
      toast.error("Échec de la demande", {
        id: toastId,
        description: error.message || "Impossible de générer le code"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    const success = await copyUtil(text)
    if (success) {
      toast.success(`${label} copié`)
    }
  }

  const handleRefreshQr = async () => {
    if (!session) {
      onCreate()
      return
    }

    setLoading(true)
    const toastId = toast.loading("Génération du QR Code...")

    try {
      const response = await api.sessions.qr(session.sessionId)
      if (response && response.qr) {
        setLocalQrCode(response.qr)
        toast.success("QR Code généré", { id: toastId })
      } else {
        // Fallback to refresh if not returned directly
        onRefresh()
        toast.success("Demande de QR Code envoyée", { id: toastId })
      }
    } catch (error: any) {
      toast.error("Échec de la génération", {
        id: toastId,
        description: error.message || "Impossible de générer le QR Code"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!session) return

    const result = await showConfirm(
      "Supprimer la session ?",
      `Voulez-vous vraiment supprimer la session "${session.sessionId}" ?`,
      "warning"
    )

    if (!result.isConfirmed) return

    setLoading(true)
    const toastId = toast.loading("Suppression...")
    try {
      await api.sessions.delete(session.sessionId)
      onRefresh()
      toast.success("Session supprimée", { id: toastId })
    } catch (error: any) {
      toast.error("Échec de la suppression", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  // A session is connected if explicitly marked as isConnected and NOT currently generating/connecting
  const isConnected = session?.isConnected && !loading
  const qrCode = localQrCode || session?.qr
  const pairingCode = localPairingCode || session?.pairingCode

  if (!session) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Smartphone className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-medium mb-1">Aucune session sélectionnée</h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">Sélectionnez une session existante ou créez-en une nouvelle pour commencer.</p>
          <Button size="sm" onClick={onCreate}>
            Créer une session
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card shadow-none">
      <CardHeader className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{session.sessionId}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">WhatsApp</p>
                <button
                  onClick={() => copyToClipboard(session.sessionId, "ID")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-0 pt-4 sm:pt-0">
            <Badge className={cn(
              "text-[10px] px-2 h-6 font-bold uppercase tracking-widest whitespace-nowrap shadow-none",
              isConnected
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            )}>
              {isConnected ? "Active" : "Inactive"}
            </Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {!isConnected ? (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/30 p-1 rounded-lg">
                <TabsTrigger value="qr" className="text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">QR Code</TabsTrigger>
                <TabsTrigger value="code" className="text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Appairage</TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="flex flex-col items-center space-y-6 pt-6">
                <div className="relative aspect-square w-full max-w-[240px] border rounded-xl flex items-center justify-center bg-muted/20 overflow-hidden shadow-inner">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-full h-full p-4 bg-white rounded-md object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                      <RefreshCw className={cn("h-6 w-6", loading && "animate-spin")} />
                      <span className="text-[10px] font-medium">{loading ? "Génération..." : "Cliquez sur actualiser pour obtenir un QR code"}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-9 px-6" onClick={handleRefreshQr} disabled={loading}>
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} />
                  Actualiser QR
                </Button>
              </TabsContent>

              <TabsContent value="code" className="space-y-6 pt-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Numéro de téléphone</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="ex: 237600000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-10 text-sm flex-1"
                    />
                    <Button size="sm" className="h-10 px-6 whitespace-nowrap w-full sm:w-auto" onClick={handleRequestPairingCode} disabled={loading || !phoneNumber}>
                      Générer le code
                    </Button>
                  </div>
                </div>

                {pairingCode ? (
                  <div className="p-6 rounded-lg bg-muted/50 border flex flex-col items-center space-y-4 shadow-inner">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Votre code d'appairage</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {pairingCode.split('').map((char: string, i: number) => (
                        <div key={i} className="w-9 h-12 border bg-card rounded-md flex items-center justify-center text-xl font-black text-primary shadow-sm">
                          {char}
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(pairingCode, "Code")}>
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copier le code
                    </Button>
                  </div>
                ) : (
                   <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                         {loading ? "Demande de code..." : "Entrez un numéro pour lier manuellement"}
                      </p>
                   </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="text-sm font-medium">Session Opérationnelle</h4>
            <p className="text-xs text-muted-foreground mt-1">L'instance est prête à envoyer et recevoir des messages.</p>

            <div className="w-full mt-6 space-y-2">
              <div className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Token de Session</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {showToken ? session.token : "••••••••••••"}
                  </span>
                  <button onClick={() => setShowToken(!showToken)} className="text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button onClick={() => copyToClipboard(session.token, "Token")} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
