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
  Key,
  Copy,
  Smartphone,
  RefreshCw,
  Hash,
  ExternalLink,
  Check
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { toast } from "sonner"
import confetti from "canvas-confetti"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import MySwal, { showAlert, showLoading } from "@/lib/swal"

interface MessagingTabsProps {
  session: {
    sessionId: string;
    status: string;
    token?: string;
    [key: string]: any;
  } | null;
  sessions: any[];
  onSessionChange: (sessionId: string) => void;
  onTabChange?: (tab: string) => void;
}

export function MessagingTabs({ session, sessions, onSessionChange, onTabChange }: MessagingTabsProps) {
  const [activeTab, setActiveTab] = React.useState("text")
  const [to, setTo] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (onTabChange) {
      onTabChange(value)
    }
  }

  // Text State
  const [message, setMessage] = React.useState("")

  // Image State
  const [imageUrl, setImageUrl] = React.useState("")
  const [imageCaption, setImageCaption] = React.useState("")

  // Doc State
  const [docUrl, setDocUrl] = React.useState("")
  const [docName, setDocName] = React.useState("")

  // Audio State
  const [audioUrl, setAudioUrl] = React.useState("")
  const [isPtt, setIsPtt] = React.useState(false)

  // Video State
  const [videoUrl, setVideoUrl] = React.useState("")
  const [videoCaption, setVideoCaption] = React.useState("")

  // Combo State
  const [comboName, setComboName] = React.useState("Envoi Rapide")
  const [comboMessage, setComboMessage] = React.useState("")

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
      toast.error(error.message || "Échec de la mise en ligne")
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!session) return toast.error("Veuillez sélectionner une session active")
    if (!to) return toast.error("Veuillez entrer un numéro de destinataire")
    if (!isConnected) return toast.error("La session n'est pas connectée")

    setLoading(true)
    const toastId = toast.loading("Envoi du message en cours...")

    try {
      const results: string[] = []

      if (activeTab === "combo") {
        // Multi-send logic for combo
        const comboPayloads: any[] = []

        if (comboMessage) {
          comboPayloads.push({ type: "text", text: comboMessage })
        }
        if (imageUrl) {
          comboPayloads.push({ type: "image", image: { link: imageUrl, caption: imageCaption } })
        }
        if (docUrl) {
          comboPayloads.push({ type: "document", document: { link: docUrl, fileName: docName } })
        }
        if (audioUrl) {
          comboPayloads.push({ type: "audio", audio: { link: audioUrl, ptt: isPtt } })
        }
        if (videoUrl) {
          comboPayloads.push({ type: "video", video: { link: videoUrl, caption: videoCaption } })
        }

        if (comboPayloads.length === 0) {
          throw new Error("Veuillez remplir au moins un champ pour l'envoi combo")
        }

        // Send all payloads
        for (const payload of comboPayloads) {
          await api.messages.send(session.sessionId, { ...payload, to }, session.token)
          results.push(`${payload.type} envoyé`)
        }
      } else {
        // Single send logic
        let payload: any = { to }
        switch (activeTab) {
          case "text":
            if (!message) throw new Error("Le message est vide")
            payload = { ...payload, type: "text", text: message }
            break
          case "image":
            if (!imageUrl) throw new Error("L'URL de l'image est requise")
            payload = { ...payload, type: "image", image: { link: imageUrl, caption: imageCaption } }
            break
          case "document":
            if (!docUrl) throw new Error("L'URL du document est requise")
            payload = { ...payload, type: "document", document: { link: docUrl, fileName: docName } }
            break
          case "audio":
            if (!audioUrl) throw new Error("L'URL audio est requise")
            payload = { ...payload, type: "audio", audio: { link: audioUrl, ptt: isPtt } }
            break;
          case "video":
            if (!videoUrl) throw new Error("L'URL vidéo est requise")
            payload = { ...payload, type: "video", video: { link: videoUrl, caption: videoCaption } }
            break
        }
        await api.messages.send(session.sessionId, payload, session.token)
        results.push("Message envoyé")
      }

      toast.success(activeTab === "combo" ? `Envoi combo terminé: ${results.length} éléments envoyés` : "Message envoyé avec succès !", {
        id: toastId,
        description: `Le message a été transmis avec succès à ${to}.`
      })

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10b981', '#ffffff', '#3b82f6'],
        ticks: 200
      })

      // Clear fields after success
      if (activeTab === 'text') setMessage("")
      if (activeTab === 'combo') setComboMessage("")
    } catch (error: any) {
      toast.error("Échec de l'envoi", {
        id: toastId,
        description: error.message || "Une erreur est survenue lors de la communication avec l'API."
      })
    } finally {
      setLoading(false)
    }
  }

  const isConnected = session?.isConnected || session?.status === 'CONNECTED' || session?.status === 'AUTHENTICATED'

  return (
    <Card className="border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <SendHorizontal className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-semibold tracking-tight">Direct Messaging</CardTitle>
              <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Send messages instantly across all platforms</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-background/50 p-2 rounded-lg border border-border w-full md:w-auto">
            <div className="relative w-full md:w-[280px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Smartphone className="w-4 h-4" />
              </div>
              <Input
                id="to-input"
                placeholder="Recipient number (e.g. 237...)"
                className="w-full h-10 pl-10 border-none bg-transparent focus-visible:ring-0 text-sm font-medium"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="px-6 py-4 bg-muted/10 border-b border-border">
            <TooltipProvider delayDuration={300}>
              <TabsList className="flex w-full h-10 p-1 bg-muted/50 border border-border rounded-md justify-start gap-1 overflow-x-auto no-scrollbar">
                {[
                  { value: "text", icon: Type, label: "Text", tooltip: "Send simple text" },
                  { value: "image", icon: ImageIcon, label: "Image", tooltip: "Send image with caption" },
                  { value: "document", icon: FileText, label: "Doc", tooltip: "Send PDF, DOCX..." },
                  { value: "audio", icon: Mic, label: "Audio", tooltip: "Send audio or PTT" },
                  { value: "video", icon: Video, label: "Video", tooltip: "Send video (mp4)" },
                  { value: "combo", icon: Layers, label: "Campaign", tooltip: "Multi-type send" }
                ].map((tab) => (
                  <Tooltip key={tab.value}>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value={tab.value}
                        className="flex-1 py-1 px-3 rounded-sm font-semibold uppercase tracking-widest text-[9px] h-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <tab.icon className="w-3.5 h-3.5 mr-2" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-[10px] font-bold uppercase tracking-widest">{tab.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TabsList>
            </TooltipProvider>
          </div>

          <div className="p-8">
            <div className="min-h-[400px] flex flex-col relative overflow-hidden">
              <TabsContent value="text" className="mt-0 flex-1 flex flex-col space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Message Body</Label>
                    <span className="text-[10px] font-bold opacity-20">{message.length} chars</span>
                  </div>
                  <Textarea
                    placeholder="Type your message here..."
                    className="min-h-[250px] resize-none bg-muted/20 border-border focus-visible:ring-1 p-6 text-sm leading-relaxed"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-0 flex-1 flex flex-col space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Media URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="h-10 text-xs border-border"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="image-upload"
                        onChange={(e) => handleFileUpload(e, 'image')}
                        disabled={uploading}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0 border-border"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Caption</Label>
                    <Input
                      placeholder="Optional caption..."
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      className="h-10 text-xs border-border"
                    />
                  </div>
                </div>
                {imageUrl && (
                  <div className="mt-4 relative aspect-video w-full max-w-md bg-muted/20 border border-border rounded-lg overflow-hidden group/preview">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-black/60 rounded-full border border-white/10">Image Preview</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="document" className="mt-0 flex-1 flex flex-col space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Document URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        className="h-10 text-xs border-border"
                      />
                      <input
                        type="file"
                        className="hidden"
                        id="doc-upload"
                        onChange={(e) => handleFileUpload(e, 'document')}
                        disabled={uploading}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0 border-border"
                        onClick={() => document.getElementById('doc-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">File Name</Label>
                    <Input
                      placeholder="MyDocument.pdf"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="h-10 text-xs border-border"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audio" className="mt-0 flex-1 flex flex-col space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Audio URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        className="h-10 text-xs border-border"
                      />
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        id="audio-upload"
                        onChange={(e) => handleFileUpload(e, 'audio')}
                        disabled={uploading}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0 border-border"
                        onClick={() => document.getElementById('audio-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Audio Options</Label>
                    <div className="flex items-center gap-3 h-10 px-3 bg-muted/20 border border-border rounded-md">
                      <Switch id="ptt-mode" checked={isPtt} onCheckedChange={setIsPtt} />
                      <Label htmlFor="ptt-mode" className="text-xs font-medium cursor-pointer">Voice Note (PTT)</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="video" className="mt-0 flex-1 flex flex-col space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Video URL</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="h-10 text-xs border-border"
                      />
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        id="video-upload"
                        onChange={(e) => handleFileUpload(e, 'video')}
                        disabled={uploading}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0 border-border"
                        onClick={() => document.getElementById('video-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Video Caption</Label>
                    <Input
                      placeholder="Optional caption..."
                      value={videoCaption}
                      onChange={(e) => setVideoCaption(e.target.value)}
                      className="h-10 text-xs border-border"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="combo" className="mt-0 flex-1 flex flex-col space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Campaign Text Body</Label>
                    <Textarea
                      placeholder="Type the message for your combined campaign..."
                      className="min-h-[150px] resize-none bg-muted/20 border-border"
                      value={comboMessage}
                      onChange={(e) => setComboMessage(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Included Media</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: ImageIcon, label: "Image", active: imageUrl },
                        { icon: FileText, label: "Document", active: docUrl },
                        { icon: Mic, label: "Audio", active: audioUrl },
                        { icon: Video, label: "Video", active: videoUrl }
                      ].map((item, i) => (
                        <div key={i} className={cn(
                          "p-3 rounded-md border flex flex-col items-center justify-center gap-1.5 transition-all text-[8px] font-bold uppercase tracking-widest",
                          item.active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-muted/20 opacity-30"
                        )}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Campaign Mode</p>
                      </div>
                      <p className="text-[10px] leading-relaxed opacity-60 font-medium">
                        Send all configured media elements at once with the text body. Perfect for marketing announcements.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <div className="mt-auto pt-8 flex flex-col md:flex-row items-center justify-end gap-4 border-t border-border mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMessage("");
                    setImageUrl("");
                    setImageCaption("");
                    setDocUrl("");
                    setDocName("");
                    setAudioUrl("");
                    setVideoUrl("");
                    setVideoCaption("");
                  }}
                  className="w-full md:w-auto px-10 h-10 rounded-md text-[10px] font-bold uppercase tracking-widest border-border"
                >
                  Clear Fields
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={loading || !isConnected || (activeTab === 'text' && !message) || (activeTab === 'image' && !imageUrl) || (activeTab === 'document' && !docUrl) || (activeTab === 'audio' && !audioUrl) || (activeTab === 'video' && !videoUrl) || (activeTab === 'combo' && !comboMessage && !imageUrl && !docUrl && !audioUrl && !videoUrl)}
                  className="w-full md:w-auto gap-3 px-10 h-10 rounded-md text-[10px] font-bold uppercase tracking-widest shadow-md"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="w-4 h-4" />
                  )}
                  {loading ? "Sending..." : "Submit Message"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
