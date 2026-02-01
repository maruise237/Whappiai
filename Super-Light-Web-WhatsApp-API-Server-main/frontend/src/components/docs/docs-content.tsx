"use client"

import * as React from "react"
import { 
  Book, 
  Lock, 
  Settings, 
  MessageSquare, 
  Share2, 
  FileJson,
  Info,
  Copy,
  Check,
  Zap
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CodeBlockProps {
  code: string;
  lang?: string;
}

function CodeBlock({ code, lang = "bash" }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
          {lang}
        </span>
        <button 
          onClick={copyToClipboard}
          className="p-1.5 bg-slate-900 border border-slate-800 rounded-md hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <ScrollArea className="w-full rounded-lg border border-slate-800 bg-[#0f172a] p-4 font-mono text-sm text-slate-300 leading-relaxed">
        <pre className="whitespace-pre">{code}</pre>
      </ScrollArea>
    </div>
  )
}

function Endpoint({ method, path, children }: { method: string, path: string, children: React.ReactNode }) {
  const methodColor = {
    GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    POST: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    PUT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    DELETE: "bg-red-500/10 text-red-500 border-red-500/20",
  }[method] || "bg-slate-500/10 text-slate-500 border-slate-500/20"

  return (
    <div className="mb-12 last:mb-0">
      <div className="flex items-center gap-3 mb-4">
        <Badge variant="outline" className={`${methodColor} font-bold px-2 py-0.5 rounded text-xs`}>
          {method}
        </Badge>
        <code className="text-sm font-semibold text-foreground bg-muted px-2 py-1 rounded">
          {path}
        </code>
      </div>
      {children}
    </div>
  )
}

export function DocsContent() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Overview */}
      <section id="overview" className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-4">
          <Book className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        </div>
        <p className="text-muted-foreground text-lg leading-relaxed mb-6">
          This document provides detailed, developer-focused instructions for using the WhatsApp API. For interactive testing, we recommend using the <strong>Quick Message</strong> tool on the Dashboard.
        </p>

        <Alert className="bg-primary/5 border-primary/20 mb-8">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-bold">Base URL configuration</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            The base URL format depends on your deployment environment. For production, always use HTTPS.
          </AlertDescription>
        </Alert>

        <Card className="border-2 border-primary/10 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">Environment</TableHead>
                <TableHead className="font-bold">V1 API Base URL</TableHead>
                <TableHead className="font-bold">Legacy API Base URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Local Development</TableCell>
                <TableCell><code>http://localhost:3000/api/v1</code></TableCell>
                <TableCell><code>http://localhost:3000/api</code></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Production (HTTPS)</TableCell>
                <TableCell><code>https://api.yourdomain.com/api/v1</code></TableCell>
                <TableCell><code>https://api.yourdomain.com/api</code></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* Authentication */}
      <section id="authentication" className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Authentication</h2>
        </div>
        <p className="text-muted-foreground mb-6">
          All API requests to the <code>/api/v1/*</code> endpoints must be authenticated using a Bearer Token.
        </p>

        <div className="grid gap-6">
          <Card className="border-2 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Bearer Token</CardTitle>
              <CardDescription>Include the token in your Authorization header for every request.</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock code='Authorization: Bearer <your_api_token>' lang="http" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Session Management */}
      <section id="sessions" className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Session Management</h2>
        </div>

        <Endpoint method="POST" path="/sessions">
          <h4 className="text-xl font-bold mb-2">Create Session</h4>
          <p className="text-muted-foreground mb-4">
            Creates a new WhatsApp session with a unique ID. Requires Master API Key or admin authentication.
          </p>
          
          <div className="space-y-4">
            <h5 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Request Body</h5>
            <CodeBlock code={JSON.stringify({ sessionId: "mySession" }, null, 2)} lang="json" />
            
            <h5 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Example cURL</h5>
            <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/sessions' \\
-H 'X-Master-Key: your-master-api-key' \\
-H 'Content-Type: application/json' \\
-d '{"sessionId": "mySession"}'`} />
          </div>
        </Endpoint>

        <Endpoint method="GET" path="/sessions">
          <h4 className="text-xl font-bold mb-2">List Sessions</h4>
          <p className="text-muted-foreground mb-4">
            Retrieves all active sessions and their current status. No authentication required.
          </p>
          <CodeBlock code={`curl -X GET 'http://localhost:3000/api/v1/sessions'`} />
        </Endpoint>
      </section>

      {/* Messaging */}
      <section id="messaging" className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Messaging</h2>
        </div>

        <Endpoint method="POST" path="/messages">
          <h4 className="text-xl font-bold mb-2">Send Message</h4>
          <p className="text-muted-foreground mb-6">
            Send various types of messages including text, image, audio, video, and documents.
          </p>

          <Tabs defaultValue="text" className="w-full">
            <TabsList className="bg-muted/50 p-1 mb-6">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="document">Document</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=mySession' \\
-H 'Authorization: Bearer your_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "text",
  "text": { "body": "Hello World" }
}'`} lang="bash" />
            </TabsContent>
            
            <TabsContent value="image">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=mySession' \\
-H 'Authorization: Bearer your_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }
}'`} lang="bash" />
            </TabsContent>

            <TabsContent value="audio">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=mySession' \\
-H 'Authorization: Bearer your_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "audio",
  "audio": {
    "link": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "ptt": true
  }
}'`} lang="bash" />
              <p className="text-sm text-muted-foreground mt-2">
                Use <code>&quot;ptt&quot;: true</code> for Push-to-Talk style voice messages.
              </p>
            </TabsContent>

            <TabsContent value="video">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=mySession' \\
-H 'Authorization: Bearer your_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "video",
  "video": {
    "link": "https://www.w3schools.com/html/mov_bbb.mp4",
    "caption": "WhatsApp Video Message"
  }
}'`} lang="bash" />
            </TabsContent>

            <TabsContent value="document">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=mySession' \\
-H 'Authorization: Bearer your_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "document",
  "document": {
    "link": "https://example.com/file.pdf",
    "filename": "document.pdf",
    "caption": "Please review this document"
  }
}'`} lang="bash" />
            </TabsContent>
          </Tabs>
        </Endpoint>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-6">
          <Share2 className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Webhooks</h2>
        </div>
        <Endpoint method="POST" path="/webhook">
          <h4 className="text-xl font-bold mb-2">Set Webhook URL</h4>
          <p className="text-muted-foreground mb-4">
            Configure where the server sends event notifications.
          </p>
          <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/webhook' \\
-H 'Authorization: Bearer your_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "sessionId": "mySession",
  "url": "https://your-webhook.com/handler"
}'`} />
        </Endpoint>
      </section>

      {/* Campaigns */}
      <section id="campaigns" className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
        </div>
        <Endpoint method="POST" path="/campaigns">
          <h4 className="text-xl font-bold mb-2">Create Campaign</h4>
          <p className="text-muted-foreground mb-4">
            Create a bulk messaging campaign.
          </p>
          <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/campaigns' \\
-H 'Authorization: Bearer your_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "name": "Spring Promotion",
  "sessionId": "mySession",
  "recipientListId": "list_123",
  "message": "Check out our new spring collection!",
  "scheduledAt": "2024-06-01T10:00:00Z"
}'`} />
        </Endpoint>
      </section>

      {/* Media Management */}
      <section id="media" className="scroll-mt-20">
        <div className="flex items-center gap-2 mb-6">
          <FileJson className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Media Management</h2>
        </div>
        <Endpoint method="POST" path="/media/upload">
          <h4 className="text-xl font-bold mb-2">Upload Media</h4>
          <p className="text-muted-foreground mb-4">
            Upload a file to get a media ID or link for use in messages.
          </p>
          <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/media/upload' \\
-H 'Authorization: Bearer your_token' \\
-F 'file=@/path/to/your/file.jpg'`} lang="bash" />
        </Endpoint>
      </section>

    </div>
  )
}
