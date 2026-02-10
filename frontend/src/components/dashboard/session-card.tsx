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

  const status = (session?.isConnected && !loading) ? "connected" : (session?.status === "GENERATING_QR" || session?.status === "CONNECTING" || loading) ? "connecting" : "disconnected"
  const qrCode = session?.qr

  return (
    <Card className={cn(
      "overflow-hidden bg-white dark:bg-card transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] w-full rounded-lg group border border-slate-200 dark:border-primary/10 shadow-lg",
      status === "connected" && "border-emerald-500/20 shadow-emerald-500/5"
    )}>
      <CardHeader className={cn(
        "bg-primary/5 pb-4 border-b border-primary/5 transition-all duration-200 rounded-t-lg p-4 sm:p-6",
        status === 'connected' && "bg-emerald-500/5 border-emerald-500/10"
      )}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className={cn(
                "p-2.5 sm:p-3 rounded-lg transition-all duration-200 shadow-sm border shrink-0",
                status === 'connected' 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20 scale-105 sm:scale-110 border-emerald-400 rotate-3' 
                  : 'bg-primary/10 text-primary border-primary/10'
              )}>
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <CardTitle className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-primary truncate">Session Instance</CardTitle>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-primary/10 text-primary text-[8px] sm:text-[10px] flex items-center justify-center font-bold cursor-help hover:bg-primary/20 transition-all duration-200 hover:scale-110">?</div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-background/95 backdrop-blur-sm border border-primary/10 p-4 shadow-xl rounded-lg max-w-xs">
                        <div className="font-semibold uppercase tracking-wider text-[10px] space-y-2">
                          <strong className="text-primary">Session WhatsApp</strong>
                          <p className="leading-relaxed opacity-70">
                            Une instance active de votre compte WhatsApp sur le serveur. 
                            Chaque session permet d'envoyer et recevoir des messages de manière autonome.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    {session && (
                      <Badge 
                        variant={status === "connected" ? "default" : status === "connecting" ? "secondary" : "destructive"}
                        className={cn(
                          "uppercase px-1.5 sm:px-3 py-0.5 sm:py-1 text-[7px] sm:text-[10px] font-semibold tracking-wider animate-in fade-in zoom-in duration-200 rounded-md sm:rounded-lg shrink-0",
                          status === 'connected' && 'bg-emerald-500 hover:bg-emerald-600 border-none shadow-md shadow-emerald-500/20'
                        )}
                      >
                        {status === 'connected' ? 'Opérationnel' : status === 'connecting' ? 'Initialisation...' : 'Hors-ligne'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-background/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-primary/5 transition-all duration-200 hover:border-primary/20 shadow-sm group/id max-w-full">
                    <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider opacity-40 shrink-0">ID:</span>
                    <span className="text-[8px] sm:text-[10px] font-semibold font-mono text-primary tracking-wider truncate">
                      {session ? session.sessionId : "---"}
                    </span>
                    {session && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => copyToClipboard(session.sessionId, 'id')}
                            className="p-0.5 sm:p-1 rounded-md sm:rounded-lg hover:bg-primary/10 transition-all duration-200 hover:scale-110 shrink-0"
                          >
                            {copiedId ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-40 group-hover/id:opacity-100 transition-opacity" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-[10px] font-bold uppercase tracking-widest">Copier l'ID de session</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {session?.token && (
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-background/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg border border-amber-500/10 transition-all duration-200 hover:border-amber-500/20 shadow-sm group/token max-w-full">
                      <span className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider text-amber-600 opacity-40 shrink-0">Token:</span>
                      <span className="text-[8px] sm:text-[10px] font-semibold font-mono text-amber-600 tracking-wider truncate">
                        {showToken ? session.token : "••••••••"}
                      </span>
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              onClick={() => setShowToken(!showToken)}
                              className="p-0.5 sm:p-1 rounded-md sm:rounded-lg hover:bg-amber-500/10 transition-all duration-200 hover:scale-110"
                            >
                              {showToken ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 opacity-40 group-hover/token:opacity-100" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-[10px] font-bold uppercase tracking-widest">{showToken ? "Masquer le token" : "Afficher le token"}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              onClick={() => copyToClipboard(session.token, 'token')}
                              className="p-0.5 sm:p-1 rounded-md sm:rounded-lg hover:bg-amber-500/10 transition-all duration-200 hover:scale-110"
                            >
                              {copiedToken ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" /> : <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 opacity-40 group-hover/token:opacity-100" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-[10px] font-bold uppercase tracking-widest">Copier le Token API</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                  
                  {!session && (
                    <CardDescription className="text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider opacity-40 italic ml-1">
                      Aucune session active
                    </CardDescription>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-row items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {session && (
                <div className="flex items-center gap-2 sm:gap-3 animate-in slide-in-from-right-8 duration-700 w-full lg:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh} 
                    disabled={loading}
                    className={cn(
                      "h-10 sm:h-12 flex-1 lg:flex-none px-3 sm:px-6 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider transition-all rounded-lg border shadow-sm",
                      status === 'connected' 
                        ? "bg-background hover:bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-200" 
                        : "bg-background/50 hover:bg-primary/5 hover:text-primary border-primary/10 hover:border-primary/30"
                    )}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2.5", loading && "animate-spin")} />
                    <span className="truncate">{status === 'connected' ? 'Actualiser' : 'Relancer'}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDelete} 
                    disabled={loading}
                    className="h-10 sm:h-12 flex-1 lg:flex-none px-3 sm:px-6 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-destructive border border-destructive/10 hover:bg-destructive/5 hover:border-destructive/30 bg-background/50 transition-all rounded-lg shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2.5" />
                    <span className="truncate">Supprimer</span>
                  </Button>
                </div>
              )}
              {!session && (
                <Button onClick={onCreate} className="h-10 sm:h-12 w-full lg:w-auto px-4 sm:px-8 rounded-lg text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider shadow-lg shadow-primary/20 animate-pulse border border-primary/20 bg-primary hover:bg-primary/90 text-white">
                  Créer une session
                </Button>
              )}
            </div>
          </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className={cn(
          "grid transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
          status === 'connected' ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}>
          <div className="overflow-hidden">
            <div className="p-4 sm:p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-primary/5 p-1 rounded-xl border border-primary/10">
                  <TabsTrigger value="qr" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300">
                    <QrCode className="w-4 h-4 mr-2" />
                    Scanner QR
                  </TabsTrigger>
                  <TabsTrigger value="code" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-300">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Lien direct / Mobile
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="mt-0 animate-in fade-in zoom-in duration-300">
                  <div className="flex flex-col items-center gap-6 sm:gap-8">
                    <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px] border-2 border-dashed border-primary/20 rounded-2xl flex items-center justify-center bg-background/50 overflow-hidden group-hover:border-primary/40 transition-all duration-300 shadow-inner p-3 sm:p-4">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {qrCode ? (
                        <div className="relative w-full h-full p-4 sm:p-8 bg-white rounded-xl flex items-center justify-center shadow-xl">
                          <img src={qrCode} alt="QR Code" className="w-full h-full object-contain animate-in fade-in zoom-in duration-300" />
                          <div className="absolute inset-0 rounded-xl border-4 sm:border-8 border-white" />
                        </div>
                      ) : status === "connecting" ? (
                        <div className="flex flex-col items-center gap-4 sm:gap-6 text-primary relative z-10">
                            <div className="relative">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 animate-spin rounded-full border-4 border-current border-t-transparent" />
                              <div className="absolute inset-0 bg-primary blur-3xl opacity-20 animate-pulse" />
                            </div>
                          <div className="space-y-1 sm:space-y-2 text-center">
                            <span className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.4em] animate-pulse block text-primary">Génération...</span>
                            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-40">Sécurisation du tunnel</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 sm:gap-8 text-muted-foreground text-center p-4 sm:p-8 relative z-10">
                          <div className="p-4 sm:p-8 rounded-2xl bg-primary/5 border-2 border-primary/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <QrCode className="w-10 h-10 sm:w-16 sm:h-16 opacity-20" />
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            <p className="text-sm sm:text-base font-black uppercase tracking-widest text-foreground">Scannez pour connecter</p>
                            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40 leading-relaxed max-w-[200px] sm:max-w-[240px] mx-auto">
                              Ouvrez WhatsApp {'>'} Appareils connectés {'>'} Connecter un appareil sur votre téléphone.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {!loading && session && !qrCode && (
                      <div className="bg-amber-500/5 border-2 border-amber-500/10 p-3 sm:p-5 rounded-xl max-w-sm w-full animate-in fade-in slide-in-from-bottom-8 shadow-sm">
                        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-amber-600 text-center leading-relaxed">
                          Cliquez sur <span className="text-amber-700 underline decoration-2 underline-offset-4">"Relancer"</span> pour obtenir un nouveau QR code de connexion.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="code" className="mt-0 animate-in fade-in zoom-in duration-300">
                  <div className="flex flex-col items-center gap-6 sm:gap-8 max-w-sm mx-auto">
                    <div className="w-full space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Numéro de téléphone</label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="+33 6 12 34 56 78" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="bg-primary/5 border-primary/10 rounded-xl h-12 text-sm font-bold tracking-wider placeholder:opacity-30"
                          />
                          <Button 
                            onClick={handleRequestPairingCode}
                            disabled={loading || !phoneNumber}
                            className="h-12 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                          >
                            <Hash className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-[8px] font-bold uppercase tracking-widest opacity-40 ml-1 leading-relaxed">
                          Format international requis (ex: +33...)
                        </p>
                      </div>

                      {pairingCode ? (
                        <div className="space-y-6 pt-4 animate-in slide-in-from-bottom-4 duration-500">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-primary text-center block">Votre code d'appairage</label>
                            <div 
                              className="flex justify-center gap-2 cursor-pointer group/code relative"
                              onClick={() => copyToClipboard(pairingCode, 'pairing')}
                              title="Cliquer pour copier le code"
                            >
                              {pairingCode.split('').map((char, i) => (
                                <div key={i} className="w-8 h-10 sm:w-10 sm:h-12 bg-white dark:bg-primary/10 border-2 border-primary/20 rounded-lg flex items-center justify-center text-lg sm:text-xl font-black text-primary shadow-sm group-hover/code:border-primary/50 group-hover/code:scale-105 transition-all duration-200">
                                  {char}
                                </div>
                              ))}
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/code:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest">
                                Cliquer pour copier
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <Button 
                              onClick={() => copyToClipboard(pairingCode, 'pairing')}
                              variant="outline"
                              className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5 font-bold uppercase tracking-widest text-[10px]"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copier le code
                            </Button>
                            
                            <a 
                              href={`https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`} 
                              className="w-full"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 font-bold uppercase tracking-widest text-[10px]">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Ouvrir WhatsApp
                              </Button>
                            </a>

                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 text-center">Procédure manuelle</p>
                              <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">1</div>
                                  <p className="text-[10px] font-bold text-foreground/70 leading-tight">Allez dans <span className="text-primary">Réglages</span> {'>'} <span className="text-primary">Appareils connectés</span></p>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">2</div>
                                  <p className="text-[10px] font-bold text-foreground/70 leading-tight">Appuyez sur <span className="text-primary">Lier un appareil</span></p>
                                </div>
                                <div className="flex items-start gap-3">
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">3</div>
                                  <p className="text-[10px] font-bold text-foreground/70 leading-tight">Choisissez <span className="text-primary underline">Lier avec un numéro de téléphone</span> en bas de l'écran</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 text-center leading-relaxed">
                              Instructions : Ouvrez WhatsApp {'>'} Appareils connectés {'>'} Connecter avec un numéro de téléphone {'>'} Saisissez ce code.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center space-y-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 opacity-60">
                          <Smartphone className="w-12 h-12 mx-auto opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                            Entrez votre numéro pour<br/>générer un code d'accès
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
          <div className="px-6 sm:px-8 py-8 sm:py-10 bg-emerald-500/[0.03] flex flex-col items-center justify-center gap-4 sm:gap-6 animate-in fade-in zoom-in duration-200 border-t border-emerald-500/5">
            <div className="flex items-center gap-3 sm:gap-4 bg-emerald-500/10 px-4 sm:px-6 py-2 sm:py-3 rounded-lg border-2 border-emerald-500/20 shadow-inner">
              <div className="relative">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 relative shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              </div>
              <p className="text-[10px] sm:text-[12px] font-black text-emerald-600 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                Service Connecté & Actif
              </p>
            </div>
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600/40 text-center">
                Votre session est parfaitement synchronisée.
              </p>
              <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-600/30">
                <CircleCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>API Prête à l'usage</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
