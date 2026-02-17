"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Code, Heart, Laptop, Zap } from "lucide-react"

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
            On recrute !
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Rejoignez <span className="text-primary">l'aventure</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Nous construisons la prochaine génération d'outils de communication pour les entreprises.
            Aidez-nous à connecter le monde, un message à la fois.
          </p>
          <Button size="lg" className="rounded-full">
            Voir les offres ouvertes <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <Card className="bg-background">
              <CardHeader>
                <Zap className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Innovation Rapide</CardTitle>
                <CardDescription>
                  Nous expédions du code tous les jours. Pas de bureaucratie, juste de l'action.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background">
              <CardHeader>
                <Laptop className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Remote First</CardTitle>
                <CardDescription>
                  Travaillez d'où vous voulez. Nous croyons en la liberté et la responsabilité.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background">
              <CardHeader>
                <Heart className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Bienveillance</CardTitle>
                <CardDescription>
                  Un environnement sain où l'apprentissage et le respect sont prioritaires.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <h2 className="text-3xl font-bold mb-8 text-center">Postes ouverts</h2>
          
          <div className="space-y-4 max-w-4xl mx-auto">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">Senior Fullstack Engineer</h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Code className="w-4 h-4" /> Engineering</span>
                    <span className="flex items-center gap-1"><Laptop className="w-4 h-4" /> Remote (Europe)</span>
                  </div>
                </div>
                <Button variant="ghost">Postuler</Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">DevOps / SRE</h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Code className="w-4 h-4" /> Infrastructure</span>
                    <span className="flex items-center gap-1"><Laptop className="w-4 h-4" /> Remote (Monde)</span>
                  </div>
                </div>
                <Button variant="ghost">Postuler</Button>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">Developer Advocate</h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> Community</span>
                    <span className="flex items-center gap-1"><Laptop className="w-4 h-4" /> Remote (US/Europe)</span>
                  </div>
                </div>
                <Button variant="ghost">Postuler</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
