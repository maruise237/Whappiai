"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Informations Légales</h1>
        
        <Tabs defaultValue="mentions" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mentions">Mentions Légales</TabsTrigger>
            <TabsTrigger value="cgu">CGU / CGV</TabsTrigger>
            <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
          </TabsList>

          <TabsContent value="mentions" className="space-y-6 bg-card p-6 rounded-xl border border-border">
            <h2 className="text-2xl font-semibold">1. Éditeur du site</h2>
            <p className="text-muted-foreground">
              Le site Whappi est édité par la société KAMTECH, société par actions simplifiée au capital de 1000€, immatriculée au Registre du Commerce et des Sociétés.
            </p>
            <p className="text-muted-foreground">
              <strong>Siège social :</strong> 123 Avenue de la Tech, 75001 Paris, France<br />
              <strong>Email :</strong> contact@whappi.com<br />
              <strong>Directeur de la publication :</strong> M. Kamel Tech
            </p>

            <h2 className="text-2xl font-semibold">2. Hébergement</h2>
            <p className="text-muted-foreground">
              Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789, USA.
            </p>
          </TabsContent>

          <TabsContent value="cgu" className="space-y-6 bg-card p-6 rounded-xl border border-border">
            <h2 className="text-2xl font-semibold">Conditions Générales d'Utilisation</h2>
            <p className="text-muted-foreground">
              L'utilisation des services Whappi implique l'acceptation pleine et entière des présentes conditions générales d'utilisation.
            </p>
            
            <h3 className="text-xl font-semibold mt-4">Accès au service</h3>
            <p className="text-muted-foreground">
              Le service est accessible gratuitement en version limitée et via abonnement pour les fonctionnalités avancées.
              Nous nous efforçons de maintenir le service accessible 24/7, mais ne pouvons être tenus responsables en cas d'interruption pour maintenance ou force majeure.
            </p>

            <h3 className="text-xl font-semibold mt-4">Responsabilité</h3>
            <p className="text-muted-foreground">
              L'utilisateur est seul responsable du contenu qu'il diffuse via nos services. Whappi décline toute responsabilité quant à l'usage fait de sa plateforme pour l'envoi de messages non sollicités (spam).
            </p>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6 bg-card p-6 rounded-xl border border-border">
            <h2 className="text-2xl font-semibold">Politique de Confidentialité</h2>
            <p className="text-muted-foreground">
              La protection de vos données personnelles est notre priorité.
            </p>

            <h3 className="text-xl font-semibold mt-4">Collecte des données</h3>
            <p className="text-muted-foreground">
              Nous collectons uniquement les données nécessaires au bon fonctionnement du service : email, numéro de téléphone (pour l'authentification WhatsApp), et historiques de conversations (chiffrés).
            </p>

            <h3 className="text-xl font-semibold mt-4">RGPD</h3>
            <p className="text-muted-foreground">
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour l'exercer, contactez dpo@whappi.com.
            </p>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  )
}
