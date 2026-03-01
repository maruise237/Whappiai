"use client";

import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, MapPin } from "lucide-react";

function ContactForm() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Envoyez-nous un message</CardTitle>
        <CardDescription>
          Remplissez le formulaire ci-dessous et nous vous répondrons.
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
            <label htmlFor="message" className="text-sm font-medium">Message</label>
            <Textarea id="message" placeholder="Comment pouvons-nous vous aider ?" className="min-h-[150px]" />
          </div>
          <Button type="submit" className="w-full">Envoyer le message</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ContactMethods() {
  const methods = [
    { icon: Mail, title: "Email", sub: "Support général", val: "contact@whappi.com", href: "mailto:contact@whappi.com" },
    { icon: MessageCircle, title: "Discord", sub: "Communauté dev", val: "Rejoindre le serveur", href: "https://discord.gg/whappi" },
    { icon: MapPin, title: "Siège", sub: "Whappi Inc.", val: "123 Tech Avenue, Paris" },
  ];

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-bold mb-6">Contact</h3>
      <div className="space-y-6">
        {methods.map((m, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <m.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-lg">{m.title}</h4>
              <p className="text-muted-foreground mb-1">{m.sub}</p>
              {m.href ? (
                <a href={m.href} className="text-primary hover:underline">{m.val}</a>
              ) : (
                <span className="text-muted-foreground">{m.val}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-32 pb-20 px-4 text-center max-w-4xl mx-auto">
        <Badge variant="outline" className="mb-6">Contactez-nous</Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Nous sommes là pour <span className="text-primary">vous aider</span>
        </h1>
        <p className="text-xl text-muted-foreground">Besoin d&apos;aide pour l&apos;intégration ?</p>
      </section>

      <section className="py-12 container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ContactForm />
          <ContactMethods />
        </div>
      </section>
      <Footer />
    </div>
  );
}
