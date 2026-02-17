"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Code, Terminal, Video, Rocket, Server } from "lucide-react"
import Link from "next/link"

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
            Centre d'apprentissage
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Guides & <span className="text-primary">Tutoriels</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Maîtrisez l'API WhatsApp avec nos guides étape par étape, des bases aux intégrations avancées.
          </p>
          
          <div className="relative w-full max-w-lg mx-auto">
            <input 
              type="text" 
              placeholder="Rechercher un guide (ex: chatbot, nodejs, webhooks...)" 
              className="w-full h-12 pl-4 pr-12 rounded-lg border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-md">
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Par où commencer ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Démarrage rapide</CardTitle>
                <CardDescription>
                  Envoyez votre premier message en moins de 5 minutes avec notre guide Quickstart.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Terminal className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Installation Serveur</CardTitle>
                <CardDescription>
                  Déployez votre propre instance Whappi sur Docker ou VPS en quelques commandes.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>API Reference</CardTitle>
                <CardDescription>
                  Documentation complète de tous les endpoints, paramètres et réponses de l'API.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Guides par catégorie</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-xl flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" /> Infrastructure
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Configuration Docker Compose</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">5 min</span>
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Gestion des sessions multiples</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">8 min</span>
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Sécuriser votre instance (SSL/Auth)</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">10 min</span>
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-xl flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" /> Développement
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Créer un chatbot simple (Node.js)</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">15 min</span>
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Webhooks: Recevoir des messages</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">7 min</span>
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Envoyer des médias et fichiers</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">4 min</span>
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-xl flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" /> Tutoriels Vidéo
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Whappi Crash Course 2026</span>
                    <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">Youtube</span>
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-between group">
                    <span>Intégration n8n & Whappi</span>
                    <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">Youtube</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  )
}
