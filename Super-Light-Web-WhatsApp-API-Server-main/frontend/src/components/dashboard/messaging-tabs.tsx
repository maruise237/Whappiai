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
  LoaderCircle,
  Upload,
  Key,
  Copy
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

import { toast } from "sonner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { showAlert, showLoading } from "@/lib/swal"

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
  const [campaign, setCampaign] = React.useState("Quick Campaign")
  const [comboMessage, setComboMessage] = React.useState("")

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const loadingAlert = showLoading("Téléchargement du fichier...")
    try {
      const result = await api.messages.upload(file, session?.token)
      const url = result.url || `/media/${result.mediaId}`
      
      switch (type) {
        case "image":
          setImageUrl(url)
          break
        case "document":
          setDocUrl(url)
          setDocName(file.name)
          break
        case "audio":
          setAudioUrl(url)
          break
        case "video":
          setVideoUrl(url)
          break
      }
      loadingAlert.close()
      showAlert("Succès", "Fichier téléchargé avec succès", "success")
    } catch (error: any) {
      loadingAlert.close()
      showAlert("Erreur", error.message || "Échec du téléchargement", "error")
    } finally {
      setUploading(false)
    }
  }

  const handleSend = async () => {
    if (!session) {
      showAlert("Attention", "Veuillez sélectionner une session active d'abord", "warning")
      return
    }

    if (session.status !== 'CONNECTED') {
      showAlert("Session non connectée", "La session sélectionnée n'est pas connectée à WhatsApp", "error")
      return
    }

    if (!to) {
      showAlert("Attention", "Numéro du destinataire requis", "warning")
      return
    }

    setLoading(true)
    const sendingAlert = showLoading("Envoi du message...")
    try {
      const payload: any = { 
        to,
        recipient_type: "individual"
      }

      switch (activeTab) {
        case "text":
          payload.type = "text"
          payload.text = { body: message }
          break
        case "image":
          payload.type = "image"
          if (imageUrl.startsWith('/media/')) {
            payload.image = { id: imageUrl.split('/').pop(), caption: imageCaption }
          } else {
            payload.image = { link: imageUrl, caption: imageCaption }
          }
          break
        case "document":
          payload.type = "document"
          if (docUrl.startsWith('/media/')) {
            payload.document = { id: docUrl.split('/').pop(), filename: docName }
          } else {
            payload.document = { link: docUrl, filename: docName }
          }
          break
        case "audio":
          payload.type = "audio"
          if (audioUrl.startsWith('/media/')) {
            payload.audio = { id: audioUrl.split('/').pop() }
          } else {
            payload.audio = { link: audioUrl }
          }
          break
        case "video":
          payload.type = "video"
          if (videoUrl.startsWith('/media/')) {
            payload.video = { id: videoUrl.split('/').pop(), caption: videoCaption }
          } else {
            payload.video = { link: videoUrl, caption: videoCaption }
          }
          break
      }

      await api.messages.send(session.sessionId, payload, session.token)
      sendingAlert.close()
      showAlert("Succès", "Message envoyé avec succès !", "success")
      
      // Clear fields
      if (activeTab === "text") setMessage("")
    } catch (error: any) {
      sendingAlert.close()
      showAlert("Échec de l'envoi", error.message || "Impossible d'envoyer le message", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">Quick Message</CardTitle>
            <CardDescription>Send messages directly from the dashboard</CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-md border border-primary/20 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Session:</Label>
              <Select value={session?.sessionId || ""} onValueChange={onSessionChange}>
                <SelectTrigger className="w-[160px] h-7 text-xs border-none shadow-none bg-transparent focus:ring-0 font-medium">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.length === 0 ? (
                    <SelectItem value="none" disabled>No sessions available</SelectItem>
                  ) : (
                    sessions.map((s) => (
                      <SelectItem key={s.sessionId} value={s.sessionId} className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {s.sessionId}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {session?.token && (
              <div className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-md border border-primary/20 shadow-sm">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground/70 leading-none mb-0.5">Session Token</span>
                  <span className="text-[10px] font-mono text-foreground truncate max-w-[120px]" title={session.token}>
                    {session.token}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-1 hover:bg-primary/10" 
                  onClick={() => {
                    navigator.clipboard.writeText(session.token!)
                    toast.success("Token copied to clipboard")
                  }}
                >
                  <Copy className="w-3 h-3 text-primary" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-semibold">Message Type:</Label>
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-[180px] bg-muted/50 border-primary/20">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text" className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4" /> <span>Text Message</span>
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> <span>Image</span>
                  </div>
                </SelectItem>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> <span>Document</span>
                  </div>
                </SelectItem>
                <SelectItem value="audio">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4" /> <span>Audio/Voice</span>
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" /> <span>Video</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="text" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="to">Recipient Number</Label>
              <Input 
                id="to" 
                placeholder="e.g. 6281234567890" 
                className="max-w-md" 
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Format: country code + number (no + or 00)</p>
            </div>

            <TabsContent value="text" className="space-y-4 m-0">
              <div className="space-y-2">
                <Label htmlFor="message">Message Body</Label>
                <Textarea 
                  id="message" 
                  placeholder="Type your message here..." 
                  className="min-h-[120px]" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="image-url">Image URL</Label>
                  <Input 
                    id="image-url" 
                    placeholder="https://example.com/image.jpg" 
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Or Upload Local File</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileUpload(e, "image")}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {uploading && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-caption">Caption (Optional)</Label>
                <Input 
                  id="image-caption" 
                  placeholder="Image caption..." 
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="document" className="space-y-4 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-url">Document URL</Label>
                  <Input 
                    id="doc-url" 
                    placeholder="https://example.com/file.pdf" 
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Or Upload Local File</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      onChange={(e) => handleFileUpload(e, "document")}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {uploading && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-name">File Name</Label>
                <Input 
                  id="doc-name" 
                  placeholder="document.pdf" 
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-4 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audio-url">Audio URL</Label>
                  <Input 
                    id="audio-url" 
                    placeholder="https://example.com/audio.mp3" 
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Or Upload Local File</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="audio/*"
                      onChange={(e) => handleFileUpload(e, "audio")}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {uploading && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch 
                  id="ptt" 
                  checked={isPtt}
                  onCheckedChange={setIsPtt}
                />
                <Label htmlFor="ptt">Send as PTT (Voice Message)</Label>
              </div>
            </TabsContent>

            <TabsContent value="video" className="space-y-4 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="video-url">Video URL</Label>
                  <Input 
                    id="video-url" 
                    placeholder="https://example.com/video.mp4" 
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Or Upload Local File</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="video/*"
                      onChange={(e) => handleFileUpload(e, "video")}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {uploading && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-caption">Caption (Optional)</Label>
                <Input 
                  id="video-caption" 
                  placeholder="Video caption..." 
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                />
              </div>
            </TabsContent>
          </div>

          <div className="pt-8 border-t border-primary/10 mt-8">
            <Button 
              className="w-full h-12 text-lg font-bold gap-3 shadow-lg shadow-primary/20" 
              onClick={handleSend}
              disabled={loading || !to || (activeTab === 'text' && !message)}
            >
              {loading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
