"use client"

import * as React from "react"
import {
  Smartphone,
  Copy,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  ShieldCheck
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn, ensureString, safeRender } from "@/lib/utils"
import { showConfirm } from "@/lib/swal"
import { useRouter } from "next/navigation"

interface SessionCardProps {
  session: any
  onRefresh: () => void
  onCreate?: () => void
}

export function SessionCard({ session, onRefresh, onCreate }: SessionCardProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [loading, setLoading] = React.useState(false)
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("qr")
  const [showToken, setShowToken] = React.useState(false)
  const [localQrCode, setLocalQrCode] = React.useState<string | null>(null)
  const [localPairingCode, setLocalPairingCode] = React.useState<string | null>(null)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(ensureString(text))
    toast.success(`${label} copié dans le presse-papier`)
  }

  const handleRequestPairingCode = async () => {
    if (!phoneNumber) return toast.error("Veuillez entrer un numéro de téléphone")

    setLoading(true)
    const toastId = toast.loading("Demande de code...")

    try {
      const token = await getToken()
      const response = await api.sessions.pairingCode(session.sessionId, phoneNumber, token || undefined)
      if (response && response.code) {
        setLocalPairingCode(response.code)
        toast.success("Code d'appairage généré", { id: toastId })
      } else {
        onRefresh()
        toast.success("Demande envoyée", { id: toastId })
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

  const handleRefreshQr = async () => {
    setLoading(true)
    const toastId = toast.loading("Génération du QR Code...")

    try {
      const token = await getToken()
      const response = await api.sessions.qr(session.sessionId, token || undefined)
      if (response && response.qr) {
        setLocalQrCode(response.qr)
        toast.success("QR Code généré", { id: toastId })
      } else {
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
      `Voulez-vous vraiment supprimer la session "${ensureString(session.sessionId)}" ?`,
      "warning"
    )

    if (!result.isConfirmed) return

    setLoading(true)
    const toastId = toast.loading("Suppression...")
    try {
      const token = await getToken()
      await api.sessions.delete(session.sessionId, token || undefined)
      onRefresh()
      toast.success("Session supprimée", { id: toastId })
    } catch (error: any) {
      toast.error("Échec de la suppression", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const isConnected = session?.isConnected && !loading
  const qrCode = localQrCode || session?.qr || session?.qr_code
  const pairingCode = localPairingCode || session?.pairingCode || session?.pairing_code

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
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="p-4 border-b bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">{safeRender(session.sessionId)}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  "text-[9px] px-1.5 h-4 font-bold uppercase tracking-widest border-none",
                  isConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}>
                  {isConnected ? "Connecté" : "Déconnecté"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/dashboard/moderation/groups/engagement?sessionId=${session.sessionId}`)}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Engagement
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyToClipboard(session.sessionId, "ID")}>
                  <Copy className="mr-2 h-4 w-4" /> Copier l'ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent id="connection-area" className="p-4">
        {!isConnected ? (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 h-8 p-1 bg-muted/50">
                <TabsTrigger value="qr" className="text-[10px] uppercase font-bold tracking-widest">QR Code</TabsTrigger>
                <TabsTrigger value="code" className="text-[10px] uppercase font-bold tracking-widest">Pairing Code</TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="flex flex-col items-center space-y-4 pt-2">
                <div className="relative aspect-square w-full max-w-[200px] border border-border/40 rounded-lg flex items-center justify-center bg-muted/20 overflow-hidden">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-full h-full p-3 bg-white object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                      <RefreshCw className={cn("h-5 w-5 opacity-20", loading && "animate-spin")} />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{loading ? "Génération..." : "En attente"}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-widest px-4 rounded-full" onClick={handleRefreshQr} disabled={loading}>
                  <RefreshCw className={cn("h-3 w-3 mr-2", loading && "animate-spin")} />
                  Actualiser
                </Button>
              </TabsContent>

              <TabsContent value="code" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-50">Numéro de téléphone</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ex: 237600000000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-8 text-xs bg-muted/20 border-none"
                    />
                    <Button size="sm" className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest rounded-full" onClick={handleRequestPairingCode} disabled={loading || !phoneNumber}>
                      Obtenir
                    </Button>
                  </div>
                </div>

                {pairingCode ? (
                  <div className="p-4 rounded-md bg-muted/30 border border-border/40 flex flex-col items-center space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Code d'appairage</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      {ensureString(pairingCode).split('').map((char: string, i: number) => (
                        <div key={`char-${i}`} className="w-7 h-9 border bg-card rounded flex items-center justify-center text-sm font-black text-primary shadow-sm">
                          {char}
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase tracking-widest" onClick={() => copyToClipboard(pairingCode, "Code")}>
                      <Copy className="h-3 w-3 mr-1.5 opacity-50" />
                      Copier
                    </Button>
                  </div>
                ) : (
                   <div className="p-6 text-center border border-dashed rounded-md bg-muted/10">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-40">
                         {loading ? "Chargement..." : "Entrez un numéro"}
                      </p>
                   </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <h4 className="text-sm font-bold tracking-tight">Session Opérationnelle</h4>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[180px] leading-tight">Instance prête pour l'automatisation intelligente.</p>

            <div className="w-full mt-6 space-y-2">
              <div className="flex items-center justify-between p-2 rounded-md border border-border/40 bg-muted/20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Token</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {showToken ? (typeof session.token === 'string' ? session.token.substring(0, 12) + "..." : "••••••••") : "••••••••"}
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
