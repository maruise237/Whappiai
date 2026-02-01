"use client"

import * as React from "react"
import { Terminal, Copy, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ApiUsageCardProps {
  activeTab: string;
  sessionId?: string;
  token?: string;
}

export function ApiUsageCard({ activeTab, sessionId, token }: ApiUsageCardProps) {
  const [copied, setCopied] = React.useState(false)

  const getCurlExample = (tab: string) => {
    const sId = sessionId || "YOUR_SESSION_ID";
    const tkn = token || "YOUR_TOKEN";
    const base = `curl -X POST "http://localhost:3000/api/v1/messages?sessionId=${sId}" \\
-H "Authorization: Bearer ${tkn}" \\
-H "Content-Type: application/json" \\
-d '{
  "to": "6281234567890",`

    switch (tab) {
      case "image":
        return `${base}
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }
}'`
      case "video":
        return `${base}
  "type": "video",
  "video": {
    "link": "https://example.com/video.mp4",
    "caption": "Watch this!"
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
  "text": {
    "body": "Hello from Whappi API!"
  }
}'`
    }
  }

  const curlExample = getCurlExample(activeTab)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlExample)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-2 border-primary/10 h-full">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">API Reference</CardTitle>
            <CardDescription>Example cURL command for current message type</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 bg-background"
            onClick={copyToClipboard}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative group">
          <ScrollArea className="h-[300px] w-full bg-slate-950 rounded-lg border border-slate-800 p-4">
            <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {curlExample}
            </pre>
          </ScrollArea>
          <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              BASH
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground italic">
          Tip: Replace YOUR_SESSION_ID and YOUR_TOKEN with your actual credentials.
        </p>
      </CardContent>
    </Card>
  )
}
