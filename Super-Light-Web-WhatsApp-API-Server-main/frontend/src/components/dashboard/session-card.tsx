"use client"

import * as React from "react"
import { RefreshCw, CircleCheck, CircleX, LoaderCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { showConfirm, showAlert, showLoading } from "@/lib/swal"
import MySwal from "@/lib/swal"

export function SessionCard({ session, onRefresh, onCreate }: { session?: any, onRefresh: () => void, onCreate: () => void }) {
  const [loading, setLoading] = React.useState(false)

  const handleRefresh = async () => {
    if (!session) {
      onCreate()
      return
    }
    
    // Show loading for QR generation
    const loadingAlert = showLoading("Génération du QR Code...")
    
    setLoading(true)
    try {
      await api.sessions.qr(session.sessionId)
      onRefresh()
      loadingAlert.close()
    } catch (error: any) {
      console.error("Failed to refresh QR:", error)
      loadingAlert.close()
      showAlert("Erreur", error.message || "Impossible de générer le QR Code", "error")
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
    
    const loadingAlert = showLoading("Suppression de la session...")
    setLoading(true)
    try {
      await api.sessions.delete(session.sessionId, session.token)
      onRefresh()
      loadingAlert.close()
      showAlert("Supprimé", "La session a été supprimée avec succès.", "success")
    } catch (error: any) {
      console.error("Failed to delete session:", error)
      loadingAlert.close()
      showAlert("Erreur", error.message || "Impossible de supprimer la session", "error")
    } finally {
      setLoading(false)
    }
  }

  const status = session?.isConnected ? "connected" : (session?.status === "GENERATING_QR" || session?.status === "CONNECTING") ? "connecting" : "disconnected"
  const qrCode = session?.qr

  return (
    <Card className="overflow-hidden border-2 border-primary/10">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Session Management</CardTitle>
            <CardDescription>{session ? `Session: ${session.sessionId}` : "No active session"}</CardDescription>
          </div>
          {session && (
            <Badge 
              variant={status === "connected" ? "default" : status === "connecting" ? "secondary" : "destructive"}
              className="capitalize px-3 py-1"
            >
              {status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative aspect-square w-64 border-2 border-dashed border-muted-foreground/20 rounded-xl flex items-center justify-center bg-muted/30">
            {!session ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground text-center p-4">
                <CircleX className="w-10 h-10" />
                <span className="text-sm font-medium">No session found. Create one to start.</span>
                <Button onClick={onCreate} size="sm" className="mt-2">Create Session</Button>
              </div>
            ) : qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-full h-full p-4" />
            ) : status === "connecting" ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
                <span className="text-sm font-medium">Generating QR...</span>
              </div>
            ) : status === "connected" ? (
              <div className="flex flex-col items-center gap-3 text-primary">
                <CircleCheck className="w-16 h-16" />
                <span className="text-lg font-bold">Connected</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <RefreshCw className="w-10 h-10" />
                <span className="text-sm font-medium">Session disconnected</span>
                <Button onClick={handleRefresh} size="sm" variant="outline" className="mt-2">Connect</Button>
              </div>
            )}
          </div>
          
          {session && (
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button 
                variant="outline" 
                className="w-full gap-2" 
                disabled={loading || status === "connecting"}
                onClick={handleRefresh}
              >
                <RefreshCw className={`w-4 h-4 ${(loading || status === "connecting") ? "animate-spin" : ""}`} />
                {status === "connected" ? "Refresh" : "Connect"}
              </Button>
              <Button 
                variant="destructive" 
                className="w-full" 
                disabled={loading}
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
