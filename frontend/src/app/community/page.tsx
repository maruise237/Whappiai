"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, BookOpen, Calendar, Github, Heart, MessageCircle, Users } from "lucide-react"
import Link from "next/link"

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6">Community First</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Construisons le futur du <br />
            <span className="text-primary">messaging ensemble</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Rejoignez plus de 5000 développeurs, entrepreneurs et passionnés qui utilisent Whappi pour transformer leur communication.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="h-12 px-8 rounded-full" asChild>
              <Link href="https://discord.gg/whappi" target="_blank">
                <MessageCircle className="mr-2 w-5 h-5" />
                Rejoindre le Discord
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full" asChild>
              <Link href="https://github.com/kamtech/whappi" target="_blank">
                <Github className="mr-2 w-5 h-5" />
                Contribuer sur GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Entraide & Support</CardTitle>
                <CardDescription>
                  Une question technique ? Notre communauté est là pour vous aider 24/7 sur nos canaux dédiés.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BookOpen className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Ressources & Tutos</CardTitle>
                <CardDescription>
                  Accédez à des centaines de guides, templates et exemples de code partagés par la communauté.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Heart className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Showcase</CardTitle>
                <CardDescription>
                  Partagez vos projets et découvrez ce que les autres bâtissent avec l'API Whappi.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Événements à venir</h2>
            <Button variant="outline" size="sm">Voir tout</Button>
          </div>
          
          <div className="space-y-4">
            {[
              { title: "Webinar: Automatiser son support client", date: "15 Mars 2026", type: "Online" },
              { title: "Whappi Hackathon 2026", date: "1-3 Avril 2026", type: "Paris & Online" },
              { title: "Community Call #42", date: "10 Avril 2026", type: "Discord" },
            ].map((event, i) => (
              <div key={i} className="flex items-center justify-between p-6 bg-card border rounded-xl hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <Calendar className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">{event.date} • {event.type}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">S'inscrire</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
