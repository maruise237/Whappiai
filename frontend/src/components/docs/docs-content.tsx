"use client"

import * as React from "react"
import {
  Book,
  Lock,
  Settings,
  MessageSquare,
  Share2,
  FileJson,
  Info
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Endpoint } from "./Endpoint"
import { CodeBlock } from "./CodeBlock"

export function DocsContent() {
  return (
    <div className="space-y-20 max-w-5xl mx-auto">
      <section id="overview" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Book className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Vue d&apos;ensemble</h2>
        </div>
        <p className="text-muted-foreground text-sm font-bold leading-relaxed mb-8 uppercase tracking-wide opacity-70">
          Ce document fournit des instructions détaillées pour l&apos;utilisation de l&apos;API WhatsApp.
        </p>

        <Alert className="bg-primary/5 border-2 border-primary/10 rounded-lg mb-10 p-6 shadow-inner">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-primary font-black uppercase tracking-widest text-[11px] mb-2">Configuration</AlertTitle>
          <AlertDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider opacity-70">
            Le format de l&apos;URL de base dépend de votre environnement.
          </AlertDescription>
        </Alert>

        <Card className="border-2 border-primary/5 rounded-lg overflow-hidden bg-card/50 backdrop-blur-md shadow-xl">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-muted/20">
                <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-8">Environnement</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px] h-14">URL V1</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pr-8">URL Legacy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b border-muted/10 last:border-0 hover:bg-primary/5 transition-colors">
                <TableCell className="font-black uppercase tracking-tight text-[11px] pl-8 py-6">Développement</TableCell>
                <TableCell>
                  <code className="bg-primary/5 text-primary px-3 py-1.5 rounded-lg border-2 border-primary/5 font-mono text-[10px]">
                    http://localhost:3000/api/v1
                  </code>
                </TableCell>
                <TableCell className="pr-8">
                  <code className="bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg border-2 border-muted/20 font-mono text-[10px]">
                    http://localhost:3000/api
                  </code>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </section>

      <section id="authentication" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Authentification</h2>
        </div>
        <Card className="border-2 border-primary/10 rounded-lg bg-primary/5 p-8 shadow-inner overflow-hidden relative group">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-xl font-black uppercase tracking-tight">Jeton Bearer</CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">
              Incluez le jeton dans votre en-tête Authorization.
            </CardDescription>
          </CardHeader>
          <CodeBlock code="Authorization: Bearer <votre_api_token>" lang="http" />
        </Card>
      </section>

      <section id="sessions" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Gestion des Sessions</h2>
        </div>

        <Endpoint method="POST" path="/sessions">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Créer une Session</h4>
          <CodeBlock code={JSON.stringify({ sessionId: "maSession" }, null, 2)} lang="json" />
        </Endpoint>
      </section>

      <section id="messaging" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Messagerie</h2>
        </div>

        <Endpoint method="POST" path="/messages">
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="bg-muted/50 p-1.5 h-14 rounded-lg border-2 mb-8 grid grid-cols-5">
              <TabsTrigger value="text">Texte</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="video">Vidéo</TabsTrigger>
              <TabsTrigger value="document">Doc</TabsTrigger>
            </TabsList>
            <TabsContent value="text">
              <CodeBlock code={`curl -X POST "http://localhost:3000/api/v1/messages?sessionId=maSession" \\
-H "Authorization: Bearer token" \\
-d "{"to": "6281234567890", "text": {"body": "Bonjour"}}"`} />
            </TabsContent>
          </Tabs>
        </Endpoint>
      </section>

      <section id="webhooks" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Share2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Webhooks</h2>
        </div>
        <Endpoint method="POST" path="/webhook">
          <CodeBlock code={`curl -X POST "http://localhost:3000/api/v1/webhook" \\
-d "{"sessionId": "maSession", "url": "https://votre-webhook.com"}"`} />
        </Endpoint>
      </section>

      <section id="media" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <FileJson className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Gestion des Médias</h2>
        </div>
        <Endpoint method="POST" path="/media/upload">
          <CodeBlock code={`curl -X POST "http://localhost:3000/api/v1/media/upload" \\
-F "file=@/chemin/vers/fichier.jpg"`} />
        </Endpoint>
      </section>
    </div>
  )
}
