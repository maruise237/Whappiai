"use client"

import * as React from "react"
import { RefreshCw, Smartphone, MoreHorizontal, Copy, Check, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { api } from "@/lib/api"
import { showConfirm } from "@/lib/swal"
import { cn, copyToClipboard as copyUtil, ensureString, safeRender } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@clerk/clerk-react"
import { useTranslation } from "react-i18next"

export function SessionCard({ session, onRefresh, onCreate }: { session?: any, onRefresh: () => void, onCreate: () => void }) {
  const { getToken } = useAuth()
  const { t } = useTranslation("dashboard")
  const [loading, setLoading] = React.useState(false)
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [localQrCode, setLocalQrCode] = React.useState<string | null>(null)
  const [localPairingCode, setLocalPairingCode] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("qr")

  // Reset local state when session changes
  React.useEffect(() => {
    setLocalQrCode(null)
    setLocalPairingCode(null)
  }, [session?.sessionId])

  React.useEffect(() => {
    if (session?.status === 'DISCONNECTED') {
      setLocalQrCode(null)
      setLocalPairingCode(null)
    }
  }, [session?.status])

  // Automatically switch to correct tab if data arrives via WebSocket
  React.useEffect(() => {
    const hasCode = session?.pairingCode || session?.pairing_code || localPairingCode;
    const isValidStatus = session?.status === 'GENERATING_CODE' || session?.status === 'CONNECTING';

    if (hasCode && isValidStatus && !session?.qr && activeTab === "qr") {
      setActiveTab("code")
    }
  }, [session?.pairingCode, session?.pairing_code, session?.status, session?.qr, localPairingCode, activeTab])

  const handleRequestPairingCode = async () => {
    if (!phoneNumber) {
      toast.error(t("session_phone_required") || "Veuillez saisir un numéro de téléphone")
      return
    }

    setLoading(true)
    const toastId = toast.loading(t("session_generating_pairing") || "Génération du code d'appairage...")

    try {
      const token = await getToken()
      let response;
      if (!session) {
        const newSessionId = `session_${Math.random().toString(36).substring(2, 9)}`
        response = await api.sessions.create(newSessionId, phoneNumber, token || undefined)
        onRefresh()
      } else {
        response = await api.sessions.create(session.sessionId, phoneNumber, token || undefined)
        // We do not call onRefresh() here to prevent race conditions with WebSocket
      }

      if (response && response.pairingCode) {
        setLocalPairingCode(response.pairingCode)
        toast.success(t("session_pairing_received") || "Code d'appairage reçu", { id: toastId })
      } else {
        toast.success(t("session_pairing_sent") || "Demande envoyée, attendez le code...", { id: toastId })
      }
    } catch (error: any) {
      toast.error(t("session_pairing_failed") || "Échec de la demande", {
        id: toastId,
        description: error.message || t("session_pairing_impossible") || "Impossible de générer le code"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    const success = await copyUtil(text)
    if (success) {
      toast.success(`${label} ${t("session_copied") || "copié"}`)
    }
  }

  const handleRefreshQr = async () => {
    if (!session) {
      onCreate()
      return
    }

    setLoading(true)
    const toastId = toast.loading(t("session_generating_qr") || "Génération du QR Code...")

    try {
      const token = await getToken()
      const response = await api.sessions.qr(session.sessionId, token || undefined)
      if (response && response.qr) {
        setLocalQrCode(response.qr)
        toast.success(t("session_qr_generated") || "QR Code généré", { id: toastId })
      } else {
        // We do not need to refresh, the WebSocket will update the QR code
        toast.success(t("session_qr_sent") || "Demande de QR Code envoyée", { id: toastId })
      }
    } catch (error: any) {
      toast.error(t("session_qr_failed") || "Échec de la génération", {
        id: toastId,
        description: error.message || t("session_qr_impossible") || "Impossible de générer le QR Code"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!session) return

    const result = await showConfirm(
      t("session_delete_confirm") || "Supprimer la session ?",
      `${t("session_delete_warning") || "Voulez-vous vraiment supprimer la session"} "${ensureString(session.sessionId)}" ?`,
      "warning"
    )

    if (!result.isConfirmed) return

    setLoading(true)
    const toastId = toast.loading(t("session_deleting") || "Suppression...")
    try {
      const token = await getToken()
      await api.sessions.delete(session.sessionId, token || undefined)
      onRefresh()
      toast.success(t("session_deleted") || "Session supprimée", { id: toastId })
    } catch (error: any) {
      toast.error(t("session_delete_failed") || "Échec de la suppression", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  // A session is connected if explicitly marked as isConnected and NOT currently generating/connecting
  const isConnected = session?.isConnected && !loading
  const qrCode = localQrCode || session?.qr || session?.qr_code

  // Only show pairing code if the session is currently generating it or connecting
  const isValidStatusForCode = session?.status === 'GENERATING_CODE' || session?.status === 'CONNECTING';
  const rawPairingCode = localPairingCode || session?.pairingCode || session?.pairing_code;
  const pairingCode = isValidStatusForCode ? rawPairingCode : null;

  if (!session) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Smartphone className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-medium mb-1">{t("session_no_selection")}</h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">{t("session_no_selection_desc")}</p>
          <Button size="sm" onClick={onCreate}>
            {t("session_create_new")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{safeRender(session.sessionId)}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{t("session_whatsapp")}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <Badge className={isConnected
                ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              }>
                {isConnected ? t("session_connected") : t("session_disconnected")}
              </Badge>
              {session?.detail && !isConnected && (
                 <span className="text-[9px] text-destructive font-bold uppercase tracking-tight">
                    {ensureString(session.detail).includes('conflict') ? t("session_conflict") : safeRender(session.detail)}
                 </span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title={t("session_options")}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("session_delete")}
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
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="qr" className="text-xs">{t("session_qr")}</TabsTrigger>
                <TabsTrigger value="code" className="text-xs">{t("session_pairing_code")}</TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="flex flex-col items-center space-y-4 pt-4">
                <div className="relative aspect-square w-full max-w-[240px] border rounded-lg flex items-center justify-center bg-muted/20 overflow-hidden shadow-inner">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-full h-full p-4 bg-white rounded-md object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                      <RefreshCw className={cn("h-6 w-6", loading && "animate-spin")} />
                      <span className="text-[10px] font-medium">{loading ? t("session_generating") : t("session_click_refresh")}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-9 px-6" onClick={handleRefreshQr} disabled={loading}>
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} />
                  {t("session_refresh_qr")}
                </Button>
              </TabsContent>

              <TabsContent value="code" className="space-y-6 pt-4">
                {pairingCode ? (
                  <>
                    <div className="p-6 rounded-lg bg-muted/50 border flex flex-col items-center space-y-4 shadow-inner">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("session_pairing_code_label")}</p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {ensureString(pairingCode).split('').map((char: string, i: number) => (
                          <div key={`char-${i}`} className="w-9 h-12 border bg-card rounded-md flex items-center justify-center text-xl font-black text-primary shadow-sm">
                            {char}
                          </div>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(pairingCode, "Code")}>
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        {t("session_copy_code")}
                      </Button>
                    </div>
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground font-medium">{t("session_change_number")}</summary>
                      <div className="flex gap-2 mt-3">
                        <Input
                          placeholder={t("session_phone_placeholder")}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="h-9 text-sm"
                        />
                        <Button size="sm" className="h-9 px-3 whitespace-nowrap" onClick={handleRequestPairingCode} disabled={loading || !phoneNumber}>
                          {t("session_regenerate")}
                        </Button>
                      </div>
                    </details>
                  </>
                ) : (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">{t("session_phone_label")}</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("session_phone_placeholder")}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-10 text-sm"
                      />
                      <Button size="sm" className="h-10 px-4 whitespace-nowrap" onClick={handleRequestPairingCode} disabled={loading || !phoneNumber}>
                        {t("session_get_code")}
                      </Button>
                    </div>
                    <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                        {loading ? t("session_requesting_code") : t("session_enter_number")}
                      </p>
                    </div>
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
            <h4 className="text-sm font-medium">{t("session_operational")}</h4>
            <p className="text-xs text-muted-foreground mt-1">{t("session_operational_desc")}</p>

            <div className="w-full mt-6 space-y-2">
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
