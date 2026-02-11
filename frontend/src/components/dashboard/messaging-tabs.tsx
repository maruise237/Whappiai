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
  Smartphone
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, 
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

import { useAuth } from "@clerk/nextjs"
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
  const { getToken } = useAuth()
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
  const [campaign, setCampaign] = React.useState("Quick Campaign")
  const [comboMessage, setComboMessage] = React.useState("")

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const token = await getToken()
      const data = await api.messages.upload(file, token || undefined)
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
      const token = await getToken()
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
          await api.messages.send(session.sessionId, { ...payload, to }, token || undefined)
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
        await api.messages.send(session.sessionId, payload, token || undefined)
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
    <Card className="border-none bg-white dark:bg-card shadow-xl overflow-hidden rounded-lg messaging-tabs group relative">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mb-32 group-hover:bg-primary/10 transition-colors duration-200" />
      
      <CardHeader className="bg-primary/5 p-4 sm:p-6 lg:p-8 border-b border-primary/5 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
          <div className="flex items-center gap-4">
            <div className="p-3 sm:p-4 rounded-lg bg-primary text-white shadow-lg shadow-primary/20 border border-white/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-200">
              <SendHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-primary">Envoi de Message</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Envoyez instantanément des messages via WhatsApp</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-background/40 backdrop-blur-sm p-2 rounded-lg border border-primary/10 w-full lg:w-auto shadow-sm group/input">
            <Label htmlFor="to-input" className="sr-only">Numéro</Label>
            <div className="relative w-full lg:w-[320px]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-primary/10 rounded-lg cursor-help border border-primary/10 group-hover/input:scale-110 transition-transform">
                    <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-background/95 backdrop-blur-sm border border-primary/10 p-4 shadow-xl rounded-lg">
                  <div className="font-semibold uppercase tracking-wider text-[10px] space-y-2">
                    <p className="text-primary">Numéro du destinataire (JID)</p>
                    <p className="text-muted-foreground">Format recommandé: indicatif + numéro (ex: 22501...)</p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Input 
                id="to-input"
                placeholder="Ex: 2250102030405"
                className="w-full h-12 sm:h-14 pl-12 sm:pl-16 border-none bg-transparent focus-visible:ring-0 text-base sm:text-lg font-bold tracking-tight placeholder:font-medium placeholder:tracking-normal placeholder:opacity-30"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative z-10">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10">
            <TooltipProvider delayDuration={300}>
              <TabsList className="flex flex-row w-full h-auto p-2 sm:p-3 bg-background/40 backdrop-blur-xl border-2 border-primary/10 rounded-lg shadow-2xl overflow-x-auto no-scrollbar justify-start gap-2 sm:gap-3">
                {[
                  { value: "text", icon: Type, label: "Texte", tooltip: "Envoyer un message texte simple" },
                  { value: "image", icon: ImageIcon, label: "Image", tooltip: "Envoyer une image avec légende" },
                  { value: "document", icon: FileText, label: "Doc", tooltip: "Envoyer un document (PDF, DOCX...)" },
                  { value: "audio", icon: Mic, label: "Audio", tooltip: "Envoyer un fichier audio ou PTT" },
                  { value: "video", icon: Video, label: "Vidéo", tooltip: "Envoyer une vidéo (mp4)" },
                  { value: "combo", icon: Layers, label: "Combo", tooltip: "Envoi multiple / Campagne rapide" }
                ].map((tab) => (
                  <Tooltip key={tab.value}>
                    <TooltipTrigger asChild>
                      <TabsTrigger 
                        value={tab.value} 
                        className="flex-1 min-w-[80px] sm:min-w-[120px] gap-2 sm:gap-4 py-3 sm:py-5 rounded-lg font-black uppercase tracking-widest text-[9px] sm:text-[11px] data-[state=active]:whappi-gradient data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:shadow-primary/30 transition-all duration-200 hover:bg-primary/5"
                      >
                        <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
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

          <div className="p-4 sm:p-8 lg:p-12">
            <div className="bg-background/30 rounded-lg border-2 border-dashed border-primary/10 p-6 sm:p-12 min-h-[350px] sm:min-h-[450px] flex flex-col shadow-2xl backdrop-blur-md relative overflow-hidden group/content">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover/content:bg-primary/10 transition-colors duration-200" />
              
              <TabsContent value="text" className="mt-0 flex-1 flex flex-col space-y-6 sm:space-y-8 relative z-10">
                <div className="space-y-3 sm:space-y-5">
                  <div className="flex items-center justify-between px-2 sm:px-3">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">Message Texte</Label>
                    <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">{message.length} caractères</span>
                  </div>
                  <div className="relative group/textarea">
                    <Textarea 
                      placeholder="Écrivez votre message ici..."
                      className={cn(
                        "min-h-[200px] sm:min-h-[250px] resize-none bg-background/50 backdrop-blur-xl border-2 transition-all rounded-lg p-6 sm:p-10 text-base sm:text-lg shadow-inner placeholder:opacity-20 leading-relaxed",
                        message.length > 0 ? "border-primary/20 bg-background/80" : "border-primary/5 focus:border-primary/20 focus:bg-background/80"
                      )}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    {message.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 sm:opacity-10 group-focus-within/textarea:opacity-0 transition-opacity">
                        <SendHorizontal className="w-24 h-24 sm:w-32 sm:h-32 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-0 flex-1 flex flex-col space-y-6 sm:space-y-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">URL de l'image</Label>
                    <div className="flex gap-3 sm:gap-5">
                      <Input 
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="bg-background/50 backdrop-blur-xl rounded-lg h-14 sm:h-20 border-2 border-primary/5 focus:border-primary/20 transition-all font-mono text-[10px] sm:text-xs shadow-inner"
                      />
                      <div className="relative">
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
                          className="h-14 w-14 sm:h-20 sm:w-20 shrink-0 bg-background/50 backdrop-blur-xl rounded-lg border-2 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all duration-200 shadow-inner group/btn"
                          onClick={() => document.getElementById('image-upload')?.click()}
                          disabled={uploading}
                        >
                          {uploading ? <div className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary rounded-full border-2 border-current border-t-transparent" /> : <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover/btn:scale-110 transition-transform" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">Légende</Label>
                    <Input 
                      placeholder="Ajouter une légende..."
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      className="bg-background/50 backdrop-blur-xl rounded-lg h-14 sm:h-20 border-2 border-primary/5 focus:border-primary/20 transition-all duration-200 text-xs sm:text-sm shadow-inner"
                    />
                  </div>
                </div>
                {imageUrl && (
                  <div className="mt-6 relative aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden border-4 border-background/50 shadow-2xl bg-muted/20 group/preview">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-contain transition-transform duration-200 group-hover/preview:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200" />
                    <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover/preview:opacity-100 transition-all duration-200 translate-y-4 group-hover/preview:translate-y-0">
                      <p className="text-white text-[10px] font-black uppercase tracking-widest bg-primary/20 backdrop-blur-md px-4 py-2 rounded-full inline-block border border-white/10">Aperçu du média</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="document" className="mt-0 flex-1 flex flex-col space-y-6 sm:space-y-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">URL du document</Label>
                    <div className="flex gap-3 sm:gap-5">
                      <Input 
                        placeholder="https://example.com/file.pdf"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        className="bg-background/50 backdrop-blur-xl rounded-lg h-14 sm:h-20 border-2 border-primary/5 focus:border-primary/20 transition-all font-mono text-[10px] sm:text-xs shadow-inner"
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
                        className="h-14 w-14 sm:h-20 sm:w-20 shrink-0 bg-background/50 backdrop-blur-xl rounded-lg border-2 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all shadow-inner group/btn"
                        onClick={() => document.getElementById('doc-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <div className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary rounded-full border-2 border-current border-t-transparent" /> : <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover/btn:scale-110 transition-transform" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">Nom du fichier</Label>
                    <Input 
                      placeholder="document.pdf"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="bg-background/50 backdrop-blur-xl rounded-lg h-14 sm:h-20 border-2 border-primary/5 focus:border-primary/20 transition-all text-xs sm:text-sm shadow-inner"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audio" className="mt-0 flex-1 flex flex-col space-y-6 sm:space-y-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">URL Audio</Label>
                    <div className="flex gap-3 sm:gap-5">
                      <Input 
                        placeholder="https://example.com/audio.mp3"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        className="bg-background/50 backdrop-blur-xl rounded-lg h-14 sm:h-20 border-2 border-primary/5 focus:border-primary/20 transition-all font-mono text-[10px] sm:text-xs shadow-inner"
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
                        className="h-14 w-14 sm:h-20 sm:w-20 shrink-0 bg-background/50 backdrop-blur-xl rounded-lg border-2 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all shadow-inner group/btn"
                        onClick={() => document.getElementById('audio-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <div className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary rounded-full border-2 border-current border-t-transparent" /> : <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover/btn:scale-110 transition-transform" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">Options Audio</Label>
                    <div className="flex items-center gap-4 h-14 sm:h-20 px-6 bg-background/50 backdrop-blur-xl rounded-lg border-2 border-primary/5">
                      <Switch 
                        id="ptt-mode" 
                        checked={isPtt}
                        onCheckedChange={setIsPtt}
                      />
                      <Label htmlFor="ptt-mode" className="text-xs sm:text-sm font-medium cursor-pointer">Mode Note Vocale (PTT)</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="video" className="mt-0 flex-1 flex flex-col space-y-6 sm:space-y-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">URL Vidéo</Label>
                    <div className="flex gap-3 sm:gap-5">
                      <Input 
                        placeholder="https://example.com/video.mp4"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="bg-background/50 backdrop-blur-xl rounded-lg h-14 sm:h-20 border-2 border-primary/5 focus:border-primary/20 transition-all font-mono text-[10px] sm:text-xs shadow-inner"
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
                        className="h-14 w-14 sm:h-20 sm:w-20 shrink-0 bg-background/50 backdrop-blur-xl rounded-lg border-2 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all shadow-inner group/btn"
                        onClick={() => document.getElementById('video-upload')?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <div className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary rounded-full border-2 border-current border-t-transparent" /> : <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover/btn:scale-110 transition-transform" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-5">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">Légende Vidéo</Label>
                    <Input 
                      placeholder="Ajouter une légende..."
                      value={videoCaption}
                      onChange={(e) => setVideoCaption(e.target.value)}
                      className="bg-background/50 backdrop-blur-xl rounded-lg h-14 sm:h-20 border-2 border-primary/5 focus:border-primary/20 transition-all text-xs sm:text-sm shadow-inner"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="combo" className="mt-0 flex-1 flex flex-col space-y-8 sm:space-y-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
                  <div className="space-y-4 sm:space-y-6 lg:col-span-2">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">Message de la Campagne (Texte)</Label>
                    <div className="relative group/combo-text">
                      <Textarea 
                        placeholder="Écrivez le message texte de votre combo..."
                        className={cn(
                          "min-h-[150px] sm:min-h-[180px] resize-none bg-background/50 backdrop-blur-xl border-2 transition-all rounded-lg p-6 sm:p-10 text-base sm:text-lg shadow-inner leading-relaxed",
                          comboMessage.length > 0 ? "border-primary/20 bg-background/80" : "border-primary/5 focus:border-primary/20 focus:bg-background/80"
                        )}
                        value={comboMessage}
                        onChange={(e) => setComboMessage(e.target.value)}
                      />
                      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 sm:p-3 bg-primary/10 rounded-lg border border-primary/10 opacity-40 group-focus-within/combo-text:opacity-100 transition-opacity">
                        <Type className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-6">
                    <Label className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-1 sm:ml-2">Médias Sélectionnés</Label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-5">
                      {[
                        { icon: ImageIcon, label: "Image", active: imageUrl },
                        { icon: FileText, label: "Document", active: docUrl },
                        { icon: Mic, label: "Audio", active: audioUrl },
                        { icon: Video, label: "Vidéo", active: videoUrl }
                      ].map((item, i) => (
                        <div key={i} className={cn(
                          "p-4 sm:p-6 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 sm:gap-4 group/item relative overflow-hidden",
                          item.active 
                            ? "border-primary bg-primary/10 shadow-2xl shadow-primary/20 scale-105" 
                            : "border-primary/5 bg-background/40 opacity-20"
                        )}>
                          {item.active && (
                            <div className="absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12 bg-primary/20 rounded-full blur-xl -mr-4 -mt-4 sm:-mr-6 sm:-mt-6" />
                          )}
                          <item.icon className={cn("w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-200", item.active ? "text-primary scale-110" : "text-muted-foreground")} />
                          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6 flex flex-col justify-center">
                    <div className="p-6 sm:p-8 rounded-lg bg-primary/5 border-2 border-primary/10 space-y-3 sm:space-y-5 relative overflow-hidden group/info shadow-2xl">
                      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover/info:bg-primary/10 transition-colors duration-200" />
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full whappi-gradient shadow-lg shadow-primary/20" />
                        <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-primary">Info Combo Vision</p>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed opacity-60 font-medium italic">
                        L'option combo envoie tous les éléments configurés dans les autres onglets (Image, Doc, Audio, Vidéo) en un seul clic, accompagnés du message texte ci-dessus. Parfait pour vos campagnes marketing.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <div className="mt-auto pt-8 sm:pt-12 flex flex-col md:flex-row items-center justify-center md:justify-end gap-4 sm:gap-8 relative z-10">
                {!isConnected && (
                  <div className="w-full md:flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-destructive/10 border-2 border-destructive/20 shadow-2xl shadow-destructive/10 animate-pulse">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-destructive" />
                      <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-destructive">
                        Session non connectée - Envoi impossible
                      </p>
                    </div>
                  </div>
                )}
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
                  className="w-full md:w-auto px-10 sm:px-16 h-14 sm:h-20 rounded-lg text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] border-2 border-primary/10 hover:bg-primary/5 hover:border-primary/20 transition-all order-2 md:order-1 shadow-xl"
                >
                  Effacer
                </Button>
                <Button 
                  onClick={handleSend}
                  disabled={loading || !isConnected || (activeTab === 'text' && !message) || (activeTab === 'image' && !imageUrl) || (activeTab === 'document' && !docUrl) || (activeTab === 'audio' && !audioUrl) || (activeTab === 'video' && !videoUrl) || (activeTab === 'combo' && !comboMessage && !imageUrl && !docUrl && !audioUrl && !videoUrl)}
                  className="w-full md:w-auto gap-4 sm:gap-6 px-10 sm:px-16 h-14 sm:h-20 rounded-lg text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] whappi-gradient text-white shadow-2xl shadow-primary/40 transition-all hover:scale-[1.05] active:scale-[0.95] border-2 border-white/20 order-1 md:order-2 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  {loading ? (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <SendHorizontal className="w-6 h-6 sm:w-8 sm:h-8" />
                  )}
                  {loading ? "Envoi..." : "Envoyer le Message"}
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
