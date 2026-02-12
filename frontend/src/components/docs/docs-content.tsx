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
import { copyToClipboard as copyUtil } from "@/lib/utils"
import { toast } from "sonner"
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

  const copyToClipboard = async () => {
    const success = await copyUtil(code)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Copié dans le presse-papier")
    } else {
      toast.error("Échec de la copie")
    }
  }

  return (
    <div className="relative group my-6">
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
        <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border-2 border-primary/10 shadow-sm">
          {lang}
        </span>
        <button 
          onClick={copyToClipboard}
          className="p-2 bg-background/80 backdrop-blur-md border-2 border-primary/10 rounded-lg hover:bg-primary/10 hover:border-primary/20 transition-all duration-200 text-muted-foreground hover:text-primary shadow-sm active:scale-90"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <ScrollArea className="w-full rounded-lg border-2 border-primary/5 bg-[#0d1117] p-6 font-mono text-[11px] text-slate-300 leading-relaxed shadow-inner">
        <pre className="whitespace-pre">{code}</pre>
      </ScrollArea>
    </div>
  )
}

function Endpoint({ method, path, children }: { method: string, path: string, children: React.ReactNode }) {
  const methodColor = {
    GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    POST: "bg-sky-500/10 text-sky-500 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]",
    PUT: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    DELETE: "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
  }[method] || "bg-slate-500/10 text-slate-500 border-slate-500/20"

  return (
    <div className="mb-16 last:mb-0 bg-card/20 backdrop-blur-sm rounded-lg p-8 border-2 border-primary/5 hover:border-primary/10 transition-all duration-200 group">
      <div className="flex items-center gap-4 mb-6">
        <Badge variant="outline" className={`${methodColor} font-black px-3 py-1 rounded-lg text-[10px] tracking-[0.2em] border-2`}>
          {method}
        </Badge>
        <code className="text-[11px] font-black text-primary bg-primary/5 px-4 py-2 rounded-lg border-2 border-primary/5 shadow-inner tracking-tight">
          {path}
        </code>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

export function DocsContent() {
  return (
    <div className="space-y-20 max-w-5xl mx-auto">
      {/* Overview */}
      <section id="overview" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Book className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Vue d'ensemble</h2>
        </div>
        <p className="text-muted-foreground text-sm font-bold leading-relaxed mb-8 uppercase tracking-wide opacity-70">
          Ce document fournit des instructions détaillées et axées sur les développeurs pour l'utilisation de l'API WhatsApp. Pour des tests interactifs, nous vous recommandons d'utiliser l'outil <strong>Quick Message</strong> sur le tableau de bord.
        </p>

        <Alert className="bg-primary/5 border-2 border-primary/10 rounded-lg mb-10 p-6 shadow-inner">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-primary font-black uppercase tracking-widest text-[11px] mb-2">Configuration de l'URL de base</AlertTitle>
          <AlertDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider opacity-70">
            Le format de l'URL de base dépend de votre environnement de déploiement. Pour la production, utilisez toujours HTTPS.
          </AlertDescription>
        </Alert>

        <Card className="border-2 border-primary/5 rounded-lg overflow-hidden bg-card/50 backdrop-blur-md shadow-xl">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-muted/20">
                <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pl-8">Environnement</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px] h-14">URL de base API V1</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px] h-14 pr-8">URL de base API Legacy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b border-muted/10 last:border-0 hover:bg-primary/5 transition-colors">
                <TableCell className="font-black uppercase tracking-tight text-[11px] pl-8 py-6">Développement Local</TableCell>
                <TableCell><code className="bg-primary/5 text-primary px-3 py-1.5 rounded-lg border-2 border-primary/5 font-mono text-[10px]">http://localhost:3000/api/v1</code></TableCell>
                <TableCell className="pr-8"><code className="bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg border-2 border-muted/20 font-mono text-[10px]">http://localhost:3000/api</code></TableCell>
              </TableRow>
              <TableRow className="border-b border-muted/10 last:border-0 hover:bg-primary/5 transition-colors">
                <TableCell className="font-black uppercase tracking-tight text-[11px] pl-8 py-6">Production (HTTPS)</TableCell>
                <TableCell><code className="bg-primary/5 text-primary px-3 py-1.5 rounded-lg border-2 border-primary/5 font-mono text-[10px]">https://api.votre-domaine.com/api/v1</code></TableCell>
                <TableCell className="pr-8"><code className="bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg border-2 border-muted/20 font-mono text-[10px]">https://api.votre-domaine.com/api</code></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* Authentication */}
      <section id="authentication" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Authentification</h2>
        </div>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-wide opacity-70 mb-8">
          Toutes les requêtes API vers les points de terminaison <code>/api/v1/*</code> doivent être authentifiées à l'aide d'un jeton Bearer.
        </p>

        <div className="grid gap-8">
          <Card className="border-2 border-primary/10 rounded-lg bg-primary/5 p-8 shadow-inner overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Lock className="w-24 h-24" />
            </div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black uppercase tracking-tight">Jeton Bearer</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Incluez le jeton dans votre en-tête Authorization pour chaque requête.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CodeBlock code='Authorization: Bearer <votre_api_token>' lang="http" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Session Management */}
      <section id="sessions" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Gestion des Sessions</h2>
        </div>

        <Endpoint method="POST" path="/sessions">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Créer une Session</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Crée une nouvelle session WhatsApp avec un identifiant unique. Nécessite une clé API Master ou une authentification administrateur.
          </p>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <h5 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary/70 ml-2">Corps de la Requête</h5>
              <CodeBlock code={JSON.stringify({ sessionId: "maSession" }, null, 2)} lang="json" />
            </div>
            
            <div className="space-y-3">
              <h5 className="font-black text-[10px] uppercase tracking-[0.2em] text-primary/70 ml-2">Exemple cURL</h5>
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/sessions' \\
-H 'X-Master-Key: votre-cle-master' \\
-H 'Content-Type: application/json' \\
-d '{"sessionId": "maSession"}'`} />
            </div>
          </div>
        </Endpoint>

        <Endpoint method="GET" path="/sessions">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Lister les Sessions</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Récupère toutes les sessions actives et leur statut actuel. Aucune authentification requise.
          </p>
          <CodeBlock code={`curl -X GET 'http://localhost:3000/api/v1/sessions'`} />
        </Endpoint>
      </section>

      {/* Messaging */}
      <section id="messaging" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Messagerie</h2>
        </div>

        <Endpoint method="POST" path="/messages">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Envoyer un Message</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Envoyez divers types de messages, notamment du texte, des images, de l'audio, de la vidéo et des documents.
          </p>

          <Tabs defaultValue="text" className="w-full">
            <TabsList className="bg-muted/50 p-1.5 h-14 rounded-lg border-2 mb-8 grid grid-cols-5">
              <TabsTrigger value="text" className="rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200">Texte</TabsTrigger>
              <TabsTrigger value="image" className="rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200">Image</TabsTrigger>
              <TabsTrigger value="audio" className="rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200">Audio</TabsTrigger>
              <TabsTrigger value="video" className="rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200">Vidéo</TabsTrigger>
              <TabsTrigger value="document" className="rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200">Doc</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=maSession' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "text",
  "text": { "body": "Bonjour le monde" }
}'`} lang="bash" />
            </TabsContent>
            
            <TabsContent value="image" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=maSession' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "image",
  "image": {
    "link": "https://exemple.com/image.jpg",
    "caption": "Regardez ça !"
  }
}'`} lang="bash" />
            </TabsContent>

            <TabsContent value="audio" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=maSession' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "audio",
  "audio": {
    "link": "https://www.exemple.com/audio.mp3",
    "ptt": true
  }
}'`} lang="bash" />
            </TabsContent>
            
            <TabsContent value="video" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=maSession' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "video",
  "video": {
    "link": "https://exemple.com/video.mp4",
    "caption": "Ma vidéo"
  }
}'`} lang="bash" />
            </TabsContent>
            
            <TabsContent value="document" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/messages?sessionId=maSession' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "recipient_type": "individual",
  "to": "6281234567890",
  "type": "document",
  "document": {
    "link": "https://exemple.com/doc.pdf",
    "filename": "facture.pdf"
  }
}'`} lang="bash" />
            </TabsContent>
          </Tabs>
        </Endpoint>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Share2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Webhooks</h2>
        </div>

        <Endpoint method="POST" path="/webhook">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Définir l'URL du Webhook</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Configurez l'endroit où le serveur envoie les notifications d'événements.
          </p>
          <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/webhook' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{
  "sessionId": "maSession",
  "url": "https://votre-webhook.com/handler"
}'`} />
        </Endpoint>
      </section>

      {/* Media Management */}
      <section id="media" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <FileJson className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Gestion des Médias</h2>
        </div>

        <Endpoint method="POST" path="/media/upload">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Télécharger un Média</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Téléchargez un fichier pour obtenir un identifiant ou un lien média à utiliser dans les messages.
          </p>
          <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/media/upload' \\
-H 'Authorization: Bearer votre_token' \\
-F 'file=@/chemin/vers/votre/fichier.jpg'`} lang="bash" />
        </Endpoint>
      </section>

      {/* Recipient Lists */}
      <section id="recipient-lists" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-primary/10 rounded-lg shadow-inner">
            <Share2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Listes de Destinataires</h2>
        </div>

        <Endpoint method="GET" path="/recipient-lists">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Lister les Listes</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Récupère toutes les listes de destinataires créées par l'utilisateur ou toutes les listes pour les administrateurs.
          </p>
          <CodeBlock code={`curl -X GET 'http://localhost:3000/api/v1/recipient-lists' \\
-H 'Authorization: Bearer votre_token'`} />
        </Endpoint>

        <Endpoint method="POST" path="/recipient-lists">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Créer une Liste</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Crée une nouvelle liste de destinataires vide.
          </p>
          <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/recipient-lists' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{ "name": "Clients VIP" }'`} />
        </Endpoint>

        <Endpoint method="POST" path="/recipient-lists/:id/recipients">
          <h4 className="text-xl font-black uppercase tracking-tight mb-3">Ajouter un Destinataire</h4>
          <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest opacity-70 mb-8 leading-relaxed">
            Ajoute un nouveau destinataire à une liste existante.
          </p>
          <CodeBlock code={`curl -X POST 'http://localhost:3000/api/v1/recipient-lists/LIST_ID/recipients' \\
-H 'Authorization: Bearer votre_token' \\
-H 'Content-Type: application/json' \\
-d '{ "number": "6281234567890", "name": "John Doe" }'`} />
        </Endpoint>
      </section>

    </div>
  )
}
