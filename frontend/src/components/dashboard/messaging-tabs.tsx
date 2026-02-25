"use client"

import * as React from "react"
import {
  Type,
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  Layers,
  SendHorizontal,
  Upload,
  Smartphone,
  RefreshCw,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { toast } from "sonner"
import confetti from "canvas-confetti"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface MessagingTabsProps {
  session: {
    sessionId: string;
    status: string;
    token?: string;
    isConnected?: boolean;
    [key: string]: any;
  } | null;
  sessions: any[];
  onSessionChange: (sessionId: string) => void;
  onTabChange?: (tab: string) => void;
}

export function MessagingTabs({ session, onTabChange }: MessagingTabsProps) {
  const [activeTab, setActiveTab] = React.useState("text")
  const [to, setTo] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  // Message States
  const [message, setMessage] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState("")
  const [imageCaption, setImageCaption] = React.useState("")
  const [docUrl, setDocUrl] = React.useState("")
  const [docName, setDocName] = React.useState("")
  const [audioUrl, setAudioUrl] = React.useState("")
  const [isPtt, setIsPtt] = React.useState(false)
  const [videoUrl, setVideoUrl] = React.useState("")
  const [videoCaption, setVideoCaption] = React.useState("")

  const isConnected = session?.isConnected

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const data = await api.messages.upload(file, session?.token)
      const url = data.url
      switch (type) {
        case 'image': setImageUrl(url); break;
        case 'document': setDocUrl(url); setDocName(file.name); break;
        case 'audio': setAudioUrl(url); break;
        case 'video': setVideoUrl(url); break;
      }
      toast.success("Fichier mis en ligne avec succès")
    } catch (error: any) {
      toast.error("Échec de la mise en ligne")
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!session || !isConnected) return toast.error("Session non connectée")
    if (!to) return toast.error("Destinataire requis")

    setLoading(true)
    const toastId = toast.loading("Envoi du message...")

    try {
      let payload: any = { to }
      if (activeTab === "text") {
        payload = { ...payload, type: "text", text: message }
      } else if (activeTab === "image") {
        payload = { ...payload, type: "image", image: { link: imageUrl, caption: imageCaption } }
      } else if (activeTab === "document") {
        payload = { ...payload, type: "document", document: { link: docUrl, fileName: docName } }
      } else if (activeTab === "audio") {
        payload = { ...payload, type: "audio", audio: { link: audioUrl, ptt: isPtt } }
      } else if (activeTab === "video") {
        payload = { ...payload, type: "video", video: { link: videoUrl, caption: videoCaption } }
      }

      await api.messages.send(session.sessionId, payload, session.token)
      toast.success("Message envoyé !", { id: toastId })
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } })
      if (activeTab === 'text') setMessage("")
    } catch (error: any) {
      toast.error("Échec de l'envoi", { id: toastId, description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/50 bg-card shadow-none">
      <CardHeader className="p-4 sm:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">Messagerie</CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Message Direct</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Destinataire (237...)"
              className="pl-9 h-9 text-xs"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); onTabChange?.(v); }} className="w-full">
        <div className="px-4 sm:px-6 py-0 border-b bg-muted/20 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-11 p-0 gap-6 flex w-max min-w-full">
            {[
              { value: "text", icon: Type, label: "Texte" },
              { value: "image", icon: ImageIcon, label: "Image" },
              { value: "document", icon: FileText, label: "Doc" },
              { value: "audio", icon: Mic, label: "Audio" },
              { value: "video", icon: Video, label: "Vidéo" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2.5 text-xs font-semibold gap-2 whitespace-nowrap"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <CardContent className="p-4 sm:p-6">
          <div className="min-h-[150px]">
            <TabsContent value="text" className="mt-0">
              <Textarea
                placeholder="Écrivez votre message..."
                className="min-h-[120px] text-[13px] bg-muted/10 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="image" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">URL de l'image</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-9 text-sm" />
                    <input type="file" accept="image/*" className="hidden" id="img-up" onChange={(e) => handleFileUpload(e, 'image')} />
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => document.getElementById('img-up')?.click()} disabled={uploading}>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Légende</Label>
                  <Input placeholder="Optionnel..." value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              {imageUrl && <img src={imageUrl} alt="Aperçu" className="h-32 rounded-md border object-cover" />}
            </TabsContent>

            <TabsContent value="document" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">URL du fichier</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={docUrl} onChange={(e) => setDocUrl(e.target.value)} className="h-9 text-sm" />
                    <input type="file" className="hidden" id="doc-up" onChange={(e) => handleFileUpload(e, 'document')} />
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => document.getElementById('doc-up')?.click()} disabled={uploading}>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Nom du fichier</Label>
                  <Input placeholder="fichier.pdf" value={docName} onChange={(e) => setDocName(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="audio" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">URL de l'audio</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} className="h-9 text-sm" />
                    <input type="file" accept="audio/*" className="hidden" id="aud-up" onChange={(e) => handleFileUpload(e, 'audio')} />
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => document.getElementById('aud-up')?.click()} disabled={uploading}>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <Switch checked={isPtt} onCheckedChange={setIsPtt} />
                  <Label className="text-xs">Note vocale (PTT)</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="video" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">URL de la vidéo</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="h-9 text-sm" />
                    <input type="file" accept="video/*" className="hidden" id="vid-up" onChange={(e) => handleFileUpload(e, 'video')} />
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => document.getElementById('vid-up')?.click()} disabled={uploading}>
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Légende</Label>
                  <Input placeholder="Optionnel..." value={videoCaption} onChange={(e) => setVideoCaption(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </TabsContent>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto h-8 text-[11px] font-bold uppercase tracking-widest" onClick={() => { setMessage(""); setImageUrl(""); setDocUrl(""); setAudioUrl(""); setVideoUrl(""); }}>
              Effacer
            </Button>
            <Button size="sm" className="w-full sm:w-auto h-8 text-[11px] font-bold uppercase tracking-widest" onClick={handleSend} disabled={loading || !isConnected || !to}>
              {loading ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <SendHorizontal className="h-3 w-3 mr-2" />}
              Envoyer
            </Button>
          </div>
        </CardContent>
      </Tabs>
    </Card>
  )
}
