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
import { emitWappyEvent } from "@/lib/wappy-events"
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

  React.useEffect(() => {
    setLocalQrCode(null)
    setLocalPairingCode(null)
  }, [session?.sessionId])

  React.useEffect(() => {
    if (session?.status === "DISCONNECTED") {
      setLocalQrCode(null)
      setLocalPairingCode(null)
    }
  }, [session?.status])

  React.useEffect(() => {
    const hasCode = session?.pairingCode || session?.pairing_code || localPairingCode
    const isValidStatus = session?.status === "GENERATING_CODE" || session?.status === "CONNECTING"

    if (hasCode && isValidStatus && !session?.qr && activeTab === "qr") {
      setActiveTab("code")
    }
  }, [session?.pairingCode, session?.pairing_code, session?.status, session?.qr, localPairingCode, activeTab])

  const handleRequestPairingCode = async () => {
    if (!phoneNumber) {
      toast.error(t("session_phone_required") || "Veuillez saisir un numero de telephone")
      emitWappyEvent({ type: "system", action: "error", errorType: "pairing-phone-missing" })
      return
    }

    setLoading(true)
    const toastId = toast.loading(t("session_generating_pairing") || "Generation du code d'appairage...")
    emitWappyEvent({
      type: "session",
      action: "pairing-requested",
      sessionId: ensureString(session?.sessionId || phoneNumber),
      status: "connecting",
    })

    try {
      const token = await getToken()
      let response
      if (!session) {
        const newSessionId = `session_${Math.random().toString(36).substring(2, 9)}`
        response = await api.sessions.create(newSessionId, phoneNumber, token || undefined)
        onRefresh()
      } else {
        response = await api.sessions.create(session.sessionId, phoneNumber, token || undefined)
      }

      if (response && response.pairingCode) {
        setLocalPairingCode(response.pairingCode)
        toast.success(t("session_pairing_received") || "Code d'appairage recu", { id: toastId })
        emitWappyEvent({
          type: "session",
          action: "pairing-requested",
          sessionId: ensureString(session?.sessionId || response.sessionId || phoneNumber),
          status: "connecting",
        })
      } else {
        toast.success(t("session_pairing_sent") || "Demande envoyee, attendez le code...", { id: toastId })
        emitWappyEvent({
          type: "session",
          action: "connecting",
          sessionId: ensureString(session?.sessionId || response?.sessionId || phoneNumber),
          status: "connecting",
        })
      }
    } catch (error: any) {
      toast.error(t("session_pairing_failed") || "Echec de la demande", {
        id: toastId,
        description: error.message || t("session_pairing_impossible") || "Impossible de generer le code",
      })
      emitWappyEvent({
        type: "system",
        action: "error",
        sessionId: ensureString(session?.sessionId || phoneNumber),
        errorType: "pairing-request-failed",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    const success = await copyUtil(text)
    if (success) {
      toast.success(`${label} ${t("session_copied") || "copie"}`)
      emitWappyEvent({
        type: "session",
        action: label.toLowerCase().includes("code") ? "pairing-copied" : "copied",
        sessionId: ensureString(session?.sessionId),
      })
    }
  }

  const handleRefreshQr = async () => {
    if (!session) {
      onCreate()
      return
    }

    setLoading(true)
    const toastId = toast.loading(t("session_generating_qr") || "Generation du QR Code...")
    emitWappyEvent({
      type: "session",
      action: "qr-requested",
      sessionId: ensureString(session.sessionId),
      status: "connecting",
    })

    try {
      const token = await getToken()
      const response = await api.sessions.qr(session.sessionId, token || undefined)
      if (response && response.qr) {
        setLocalQrCode(response.qr)
        toast.success(t("session_qr_generated") || "QR Code genere", { id: toastId })
        emitWappyEvent({
          type: "session",
          action: "qr-requested",
          sessionId: ensureString(session.sessionId),
          status: "connecting",
        })
      } else {
        toast.success(t("session_qr_sent") || "Demande de QR Code envoyee", { id: toastId })
        emitWappyEvent({
          type: "session",
          action: "connecting",
          sessionId: ensureString(session.sessionId),
          status: "connecting",
        })
      }
    } catch (error: any) {
      toast.error(t("session_qr_failed") || "Echec de la generation", {
        id: toastId,
        description: error.message || t("session_qr_impossible") || "Impossible de generer le QR Code",
      })
      emitWappyEvent({
        type: "system",
        action: "error",
        sessionId: ensureString(session.sessionId),
        errorType: "qr-request-failed",
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
      toast.success(t("session_deleted") || "Session supprimee", { id: toastId })
      emitWappyEvent({
        type: "session",
        action: "deleted",
        sessionId: ensureString(session.sessionId),
        status: "disconnected",
      })
    } catch (error: any) {
      toast.error(t("session_delete_failed") || "Echec de la suppression", { id: toastId })
      emitWappyEvent({
        type: "system",
        action: "error",
        sessionId: ensureString(session.sessionId),
        errorType: "session-delete-failed",
      })
    } finally {
      setLoading(false)
    }
  }

  const isConnected = session?.isConnected && !loading
  const qrCode = localQrCode || session?.qr || session?.qr_code
  const isValidStatusForCode = session?.status === "GENERATING_CODE" || session?.status === "CONNECTING"
  const rawPairingCode = localPairingCode || session?.pairingCode || session?.pairing_code
  const pairingCode = isValidStatusForCode ? rawPairingCode : null

  if (!session) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Smartphone className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <h3 className="mb-1 text-sm font-medium">{t("session_no_selection")}</h3>
          <p className="mb-4 max-w-xs text-xs text-muted-foreground">{t("session_no_selection_desc")}</p>
          <Button size="sm" onClick={onCreate}>
            {t("session_create_new")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{safeRender(session.sessionId)}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{t("session_whatsapp")}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <Badge
                className={
                  isConnected
                    ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                }
              >
                {isConnected ? t("session_connected") : t("session_disconnected")}
              </Badge>
              {session?.detail && !isConnected && (
                <span className="text-[9px] font-bold uppercase tracking-tight text-destructive">
                  {ensureString(session.detail).includes("conflict") ? t("session_conflict") : safeRender(session.detail)}
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
                  <Trash2 className="mr-2 h-4 w-4" />
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
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="qr" className="text-xs">{t("session_qr")}</TabsTrigger>
                <TabsTrigger value="code" className="text-xs">{t("session_pairing_code")}</TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="flex flex-col items-center space-y-4 pt-4">
                <div className="relative aspect-square w-full max-w-[240px] overflow-hidden rounded-lg border bg-muted/20 shadow-inner">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code" className="h-full w-full rounded-md bg-white p-4 object-contain" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                      <RefreshCw className={cn("h-6 w-6", loading && "animate-spin")} />
                      <span className="text-[10px] font-medium">{loading ? t("session_generating") : t("session_click_refresh")}</span>
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="h-9 px-6" onClick={handleRefreshQr} disabled={loading}>
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
                  {t("session_refresh_qr")}
                </Button>
              </TabsContent>

              <TabsContent value="code" className="space-y-6 pt-4">
                {pairingCode ? (
                  <>
                    <div className="flex flex-col items-center space-y-4 rounded-lg border bg-muted/50 p-6 shadow-inner">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("session_pairing_code_label")}</p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {ensureString(pairingCode).split("").map((char: string, i: number) => (
                          <div key={`char-${i}`} className="flex h-12 w-9 items-center justify-center rounded-md border bg-card text-xl font-black text-primary shadow-sm">
                            {char}
                          </div>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(pairingCode, "Code")}>
                        <Copy className="mr-2 h-3.5 w-3.5" />
                        {t("session_copy_code")}
                      </Button>
                    </div>
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium hover:text-foreground">{t("session_change_number")}</summary>
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder={t("session_phone_placeholder")}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="h-9 text-sm"
                        />
                        <Button size="sm" className="h-9 whitespace-nowrap px-3" onClick={handleRequestPairingCode} disabled={loading || !phoneNumber}>
                          {t("session_regenerate")}
                        </Button>
                      </div>
                    </details>
                  </>
                ) : (
                  <div className="space-y-3">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("session_phone_label")}</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("session_phone_placeholder")}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-10 text-sm"
                      />
                      <Button size="sm" className="h-10 whitespace-nowrap px-4" onClick={handleRequestPairingCode} disabled={loading || !phoneNumber}>
                        {t("session_get_code")}
                      </Button>
                    </div>
                    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="text-sm font-medium">{t("session_operational")}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{t("session_operational_desc")}</p>

            <div className="mt-6 w-full space-y-2" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
