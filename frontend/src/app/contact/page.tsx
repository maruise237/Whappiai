"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageCircle, MapPin, Phone } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
            Contactez-nous
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Nous sommes là pour <span className="text-primary">vous aider</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Une question sur Whappi Enterprise ? Besoin d'aide pour l'intégration ? N'hésitez pas à nous écrire.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Envoyez-nous un message</CardTitle>
                  <CardDescription>
                    Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium">Prénom</label>
                        <Input id="firstName" placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium">Nom</label>
                        <Input id="lastName" placeholder="Doe" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">Email professionnel</label>
                      <Input id="email" type="email" placeholder="john@company.com" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">Sujet</label>
                      <Input id="subject" placeholder="Demande de démo Enterprise" />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">Message</label>
                      <Textarea id="message" placeholder="Comment pouvons-nous vous aider ?" className="min-h-[150px]" />
                    </div>
                    
                    <Button type="submit" className="w-full">Envoyer le message</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold mb-6">Autres moyens de nous contacter</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Email</h4>
                      <p className="text-muted-foreground mb-1">Pour les demandes générales et le support.</p>
                      <a href="mailto:contact@whappi.com" className="text-primary hover:underline">contact@whappi.com</a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Discord Communauté</h4>
                      <p className="text-muted-foreground mb-1">Rejoignez notre serveur pour discuter avec d'autres développeurs.</p>
                      <a href="https://discord.gg/whappi" target="_blank" className="text-primary hover:underline">Rejoindre le serveur</a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Siège Social</h4>
                      <p className="text-muted-foreground">
                        Whappi Inc.<br />
                        123 Tech Avenue<br />
                        75001 Paris, France
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Card className="bg-muted/50 border-none">
                <CardHeader>
                  <CardTitle>FAQ Rapide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-1">Quel est le temps de réponse moyen ?</h5>
                    <p className="text-sm text-muted-foreground">Nous répondons généralement sous 24h ouvrées. Pour les clients Enterprise, le support est prioritaire.</p>
                  </div>
                  <div>
                    <h5 className="font-medium mb-1">Proposez-vous des démos ?</h5>
                    <p className="text-sm text-muted-foreground">Oui, contactez-nous pour planifier une démonstration de notre offre Enterprise.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
