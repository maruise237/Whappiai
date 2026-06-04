"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, FileCode, Layers, Puzzle } from "lucide-react"
import Link from "next/link"

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
            Bibliothèque
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Ressources & <span className="text-primary">Outils</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Accélérez votre développement avec nos SDKs, templates et outils open-source.
          </p>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                  <FileCode className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>SDK JavaScript / TypeScript</CardTitle>
                <CardDescription>
                  Client officiel pour Node.js et le navigateur. Type-safe et facile à utiliser.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="https://github.com/kamtech/whappi-js" target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    npm install whappi
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                  <FileCode className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>SDK Python</CardTitle>
                <CardDescription>
                  Wrapper Python complet pour l'intégration avec Django, Flask ou FastAPI.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="https://github.com/kamtech/whappi-py" target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    pip install whappi
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
                  <FileCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>SDK PHP</CardTitle>
                <CardDescription>
                  Intégrez WhatsApp dans vos projets Laravel ou Symfony.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="https://github.com/kamtech/whappi-php" target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    composer require whappi
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Postman Collection</CardTitle>
                <CardDescription>
                  Testez tous les endpoints de l'API directement depuis Postman.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="#" target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger JSON
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
                  <Puzzle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <CardTitle>Templates n8n</CardTitle>
                <CardDescription>
                  Workflows pré-configurés pour l'automatisation avec n8n.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="#" target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    Voir les templates
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center mb-4">
                  <Puzzle className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Docker Compose</CardTitle>
                <CardDescription>
                  Fichiers de configuration prêts à l'emploi pour le déploiement.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="https://github.com/kamtech/whappi" target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    Voir sur GitHub
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
