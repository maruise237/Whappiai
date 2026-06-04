"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Conditions Générales d'Utilisation</h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptation des conditions</h2>
            <p>
              En accédant et en utilisant les services de Whappi ("le Service"), vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation ("CGU"). Si vous n'acceptez pas ces termes, veuillez ne pas utiliser le Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description du Service</h2>
            <p>
              Whappi fournit une plateforme d'automatisation et d'API pour WhatsApp, permettant aux entreprises de gérer leurs communications, d'envoyer des messages automatisés et d'intégrer des fonctionnalités d'IA.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Compte utilisateur</h2>
            <p className="mb-2">
              Pour utiliser certaines fonctionnalités du Service, vous devez créer un compte. Vous êtes responsable du maintien de la confidentialité de vos informations de connexion et de toutes les activités qui se produisent sous votre compte.
            </p>
            <p>
              Vous vous engagez à fournir des informations exactes, complètes et à jour lors de votre inscription.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Utilisation acceptable</h2>
            <p className="mb-2">
              Vous vous engagez à ne pas utiliser le Service pour :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Envoyer des messages non sollicités (spam) ou violer les politiques de WhatsApp.</li>
              <li>Diffuser du contenu illégal, nuisible, menaçant, abusif, diffamatoire ou autrement répréhensible.</li>
              <li>Porter atteinte aux droits de propriété intellectuelle de tiers.</li>
              <li>Tenter d'accéder sans autorisation aux systèmes de Whappi ou de perturber le Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Tarification et Paiement</h2>
            <p>
              Certains services sont payants. Les tarifs et les conditions de paiement sont détaillés sur notre page de tarification. Whappi se réserve le droit de modifier ses tarifs avec un préavis raisonnable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Limitation de responsabilité</h2>
            <p>
              Le Service est fourni "tel quel". Whappi ne garantit pas que le Service sera ininterrompu ou exempt d'erreurs. Dans toute la mesure permise par la loi, Whappi ne sera pas responsable des dommages indirects, accessoires ou consécutifs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Modification des conditions</h2>
            <p>
              Nous nous réservons le droit de modifier ces CGU à tout moment. Les modifications prendront effet dès leur publication sur le site. Votre utilisation continue du Service après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Contact</h2>
            <p>
              Pour toute question concernant ces CGU, veuillez nous contacter à : <a href="mailto:legal@whappi.com" className="text-primary hover:underline">legal@whappi.com</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
