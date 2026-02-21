"use client"

import * as React from "react"
import { RefreshCw, CircleCheck, CircleX, Trash2, Smartphone, QrCode, Copy, Check, Eye, EyeOff, ExternalLink, Hash } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { showConfirm, showAlert, showLoading } from "@/lib/swal"
import MySwal from "@/lib/swal"
import { cn, copyToClipboard as copyUtil } from "@/lib/utils"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function SessionCard({ session, onRefresh, onCreate }: { session?: any, onRefresh: () => void, onCreate: () => void }) {
  const [loading, setLoading] = React.useState(false)
  const [showToken, setShowToken] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState(false)
  const [copiedToken, setCopiedToken] = React.useState(false)
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [pairingCode, setPairingCode] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("qr")

  // Update pairing code if it comes from session status
  React.useEffect(() => {
    if (session?.pairingCode) {
      setPairingCode(session.pairingCode)
    }
  }, [session?.pairingCode])

  const handleRequestPairingCode = async () => {
    if (!phoneNumber) {
      toast.error("Veuillez saisir un numéro de téléphone")
      return
    }

    setLoading(true)
    const toastId = toast.loading("Génération du code d'appairage...")

    try {
      if (!session) {
        // Create new session with phone number
        const newSessionId = `session_${Math.random().toString(36).substring(2, 9)}`
        await api.sessions.create(newSessionId, phoneNumber)
        onRefresh()

        // Célébration de création
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff']
        })
      } else {
        // Relancer avec numéro de téléphone
        await api.sessions.create(session.sessionId, phoneNumber)
        onRefresh()
      }
      toast.success("Demande envoyée. Attendez le code...", { id: toastId })
    } catch (error: any) {
      console.error("Failed to request pairing code:", error)
      toast.error("Échec de la demande", {
        id: toastId,
        description: error.message || "Impossible de générer le code"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'id' | 'token' | 'pairing') => {
    const success = await copyUtil(text)
    if (success) {
      if (type === 'id') {
        setCopiedId(true)
        setTimeout(() => setCopiedId(false), 2000)
      } else if (type === 'token') {
        setCopiedToken(true)
        setTimeout(() => setCopiedToken(false), 2000)
      }
      toast.success(`${type === 'id' ? 'ID' : type === 'token' ? 'Token' : 'Code'} copié dans le presse-papier`)
    } else {
      toast.error("Échec de la copie")
    }
  }

  const handleRefresh = async () => {
    if (!session) {
      onCreate()
      return
    }

    setLoading(true)
    const toastId = toast.loading("Génération du QR Code...")

    try {
      await api.sessions.qr(session.sessionId)
      onRefresh()
      toast.success("QR Code généré avec succès", { id: toastId })
    } catch (error: any) {
      console.error("Failed to refresh QR:", error)
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
      `Voulez-vous vraiment supprimer la session "${session.sessionId}" ? Cette action est irréversible.`,
      "warning"
    )

    if (!result.isConfirmed) return

    setLoading(true)
    const toastId = toast.loading("Suppression de la session...")
    try {
      await api.sessions.delete(session.sessionId, session.token)
      onRefresh()
      toast.success("Session supprimée", { id: toastId })
    } catch (error: any) {
      console.error("Failed to delete session:", error)
      toast.error("Échec de la suppression", {
        id: toastId,
        description: error.message || "Impossible de supprimer la session"
      })
    } finally {
      setLoading(false)
    }
  }

  const status = (session?.isConnected && !loading) ? "connected" : (session?.status === "GENERATING_QR" || session?.status === "GENERATING_CODE" || session?.status === "CONNECTING" || loading) ? "connecting" : "disconnected"
  const qrCode = session?.qr
  const pairingCodeValue = session?.pairingCode || pairingCode

  return (
    <Card className="overflow-hidden border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-md border",
            status === 'connected' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-primary/5 text-primary border-primary/10"
          )}>
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">{session ? session.sessionId : "No Session Selected"}</span>
              {session && (
                <Badge
                  variant={status === "connected" ? "default" : status === "connecting" ? "secondary" : "destructive"}
                  className={cn(
                    "text-[10px] h-4.5 px-2 font-medium",
                    status === 'connected' && "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                  )}
                >
                  {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Initializing...' : 'Disconnected'}
                </Badge>
              )}
            </div>
            {session && (
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[10px] text-muted-foreground font-mono">
                <div className="flex items-center gap-1 group/id max-w-full">
                  <span className="truncate max-w-[120px] sm:max-w-none">ID: {session.sessionId}</span>
                  <button onClick={() => copyToClipboard(session.sessionId, 'id')} className="opacity-0 group-hover/id:opacity-100 transition-opacity">
                    {copiedId ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                </div>
                {session?.token && (
                  <div className="flex items-center gap-1 group/token">
                    <span>TOKEN: {showToken ? session.token : "••••••••"}</span>
                    <button onClick={() => setShowToken(!showToken)} className="opacity-40 hover:opacity-100 transition-opacity">
                      {showToken ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                    </button>
                    <button onClick={() => copyToClipboard(session.token, 'token')} className="opacity-0 group-hover/token:opacity-100 transition-opacity">
                      {copiedToken ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {session && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 text-xs font-medium gap-2 border-border"
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              {status === 'connected' ? 'Sync' : 'Retry'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="h-8 text-xs font-medium gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className={cn(
          "grid transition-all duration-200",
          status === 'connected' ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}>
          <div className="overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-10">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 h-10 bg-muted/50 p-1 border border-border">
                  <TabsTrigger value="qr" className="text-xs font-semibold uppercase tracking-widest gap-2">
                    <QrCode className="w-3.5 h-3.5" />
                    QR SCAN
                  </TabsTrigger>
                  <TabsTrigger value="code" className="text-xs font-semibold uppercase tracking-widest gap-2">
                    <Smartphone className="w-3.5 h-3.5" />
                    PAIRING CODE
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="mt-0">
                  <div className="flex flex-col items-center gap-8">
                    <div className="relative aspect-square w-full max-w-[280px] border border-border rounded-lg flex items-center justify-center bg-muted/20 overflow-hidden shadow-inner">
                      {qrCode ? (
                        <div className="w-full h-full p-6 bg-white flex items-center justify-center">
                          <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
                        </div>
                      ) : status === "connecting" ? (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Generating QR...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-muted-foreground text-center p-8">
                          <QrCode className="w-12 h-12 opacity-10" />
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 leading-relaxed">
                            Select a session or click retry<br />to generate a QR code.
                          </p>
                        </div>
                      )}
                    </div>

                    {!loading && session && !qrCode && (
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/60 text-center">
                        Hit "Retry" to get a new QR code.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="code" className="mt-0">
                  <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
                    <div className="w-full space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Phone Number</label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="+237 600..."
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="h-10 text-xs font-medium border-border shadow-none focus-visible:ring-1"
                          />
                          <Button
                            onClick={handleRequestPairingCode}
                            disabled={loading || !phoneNumber}
                            size="sm"
                            className="h-10 px-4 text-xs font-bold uppercase tracking-widest"
                          >
                            Get Code
                          </Button>
                        </div>
                      </div>

                      {pairingCodeValue ? (
                        <div className="space-y-6 pt-4">
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary text-center block">Your Pairing Code</label>
                            <div className="flex flex-wrap justify-center gap-2 group/code">
                              {pairingCodeValue.split('').map((char: string, i: number) => (
                                <div key={i} className="w-7 h-9 sm:w-8 sm:h-10 border border-border bg-card rounded flex items-center justify-center text-sm sm:text-lg font-bold text-primary shadow-sm">
                                  {char}
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button
                            onClick={() => copyToClipboard(pairingCodeValue, 'pairing')}
                            variant="outline"
                            className="w-full h-10 text-[10px] font-bold uppercase tracking-widest border-border"
                          >
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Copy Code
                          </Button>
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-4 bg-muted/30 rounded-lg border border-dashed border-border">
                          <Smartphone className="w-8 h-8 mx-auto opacity-10" />
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 leading-relaxed">
                            Enter number to<br />link account manually.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {status === 'connected' && (
          <div className="px-6 py-12 bg-emerald-500/[0.02] flex flex-col items-center justify-center gap-4 border-t border-border">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CircleCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                Session Operational
              </p>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                API is ready to process messages.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
