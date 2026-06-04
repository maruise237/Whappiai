"use client"

import * as React from "react"
import { Terminal, Copy, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, copyToClipboard as copyUtil } from "@/lib/utils"
import { toast } from "sonner"

interface ApiUsageCardProps {
  activeTab: string;
  sessionId?: string;
  token?: string;
}

export function ApiUsageCard({ activeTab, sessionId, token }: ApiUsageCardProps) {
  const [copied, setCopied] = React.useState(false)

  const getCurlExample = (tab: string) => {
    const sId = sessionId || "SESSION_ID";
    const tkn = token || "YOUR_TOKEN";
    const base = `curl -X POST "http://localhost:3010/api/v1/messages?sessionId=${sId}" \\
  -H "Authorization: Bearer ${tkn}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "2250102030405",`

    switch (tab) {
      case "image":
        return `${base}
    "type": "image",
    "image": {
      "link": "https://example.com/image.jpg",
      "caption": "Regardez ça !"
    }
  }'`
      case "video":
        return `${base}
    "type": "video",
    "video": {
      "link": "https://example.com/video.mp4",
      "caption": "Visionnez ceci !"
    }
  }'`
      case "audio":
        return `${base}
    "type": "audio",
    "audio": {
      "link": "https://example.com/audio.mp3"
    }
  }'`
      case "document":
        return `${base}
    "type": "document",
    "document": {
      "link": "https://example.com/file.pdf",
      "filename": "document.pdf"
    }
  }'`
      default:
        return `${base}
    "type": "text",
    "text": "Bonjour de l'API Whappi !"
  }'`
    }
  }

  const curlExample = getCurlExample(activeTab)

  const copyToClipboard = async () => {
    const success = await copyUtil(curlExample)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copié dans le presse-papier")
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Terminal className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Exemple d'API</p>
              <p className="text-xs text-muted-foreground">Implémentation cURL</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-2" onClick={copyToClipboard}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-64 w-full bg-slate-950 rounded-md p-4">
          <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">
            {curlExample}
          </pre>
        </ScrollArea>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[10px] text-muted-foreground font-medium">
            Endpoint: <span className="text-foreground">POST /api/v1/messages</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
