"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Conditions Générales d&apos;Utilisation</h1>
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptation des Conditions</h2>
            <p className="text-muted-foreground">
              En accédant et en utilisant Whappi, vous acceptez d&apos;être lié par les présentes conditions.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description du Service</h2>
            <p className="text-muted-foreground">
              Whappi fournit une interface de gestion et d&apos;automatisation pour WhatsApp. Nous ne sommes pas
              affiliés à WhatsApp Inc.
            </p>
          </section>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Responsabilité de l&apos;Utilisateur</h2>
            <p className="text-muted-foreground">
              Vous êtes responsable de tout contenu envoyé via votre compte et du respect des conditions
              de WhatsApp.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
