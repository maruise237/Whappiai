"use client"

import * as React from "react"
import { Terminal, Copy, Check } from "lucide-react"
import Prism from "prismjs"
import "prismjs/components/prism-bash"
import "prismjs/themes/prism-tomorrow.css"
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
    const sId = sessionId || "ID_SESSION";
    const tkn = token || "VOTRE_TOKEN";
    const base = `curl -X POST "http://localhost:3000/api/v1/messages?sessionId=${sId}" \\
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
    "text": "Bonjour depuis l'API Whappi !"
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
    } else {
      toast.error("Échec de la copie")
    }
  }

  return (
    <Card className="overflow-hidden bg-card border border-border rounded-lg shadow-sm group">
      <CardHeader className="bg-muted/30 p-6 border-b border-border relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-semibold tracking-tight">API Interface</CardTitle>
              <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Reference cURL implementation</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2.5 h-9 px-4 rounded-md transition-all w-full sm:w-auto text-xs font-medium",
              copied
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "border-border hover:bg-muted"
            )}
            onClick={copyToClipboard}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Code"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 relative z-10">
        <div className="relative group/code">
          <ScrollArea className="h-[280px] w-full bg-slate-950 rounded-md border border-border p-5 shadow-inner">
            <pre className="font-mono text-[12px] text-slate-300 whitespace-pre-wrap leading-relaxed">
              <code
                className="language-bash"
                dangerouslySetInnerHTML={{
                  __html: Prism.highlight(curlExample, Prism.languages.bash, 'bash')
                }}
              />
            </pre>
          </ScrollArea>
        </div>
        <div className="mt-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
          <span className="flex items-center gap-2">
            Active Endpoint: <span className="text-primary font-semibold">POST</span>
            <span className="px-2 py-0.5 rounded bg-primary/5 text-primary/70 border border-primary/10 font-mono">/api/v1/messages</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
