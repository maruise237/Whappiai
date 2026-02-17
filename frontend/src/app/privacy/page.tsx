"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Politique de Confidentialité</h1>
        
        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p>
              La confidentialité de vos données est une priorité pour Whappi ("nous", "notre", "nos"). Cette Politique de Confidentialité décrit comment nous collectons, utilisons, partageons et protégeons vos informations personnelles lorsque vous utilisez notre site web et nos services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Données collectées</h2>
            <p className="mb-2">
              Nous collectons les types d'informations suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informations de compte :</strong> Nom, prénom, adresse email, mot de passe (chiffré).</li>
              <li><strong>Données de communication :</strong> Numéros de téléphone, historiques de messages (chiffrés), métadonnées.</li>
              <li><strong>Informations techniques :</strong> Adresse IP, type de navigateur, système d'exploitation, données d'utilisation.</li>
              <li><strong>Informations de paiement :</strong> Traitées par nos prestataires de paiement sécurisés (ex: Stripe). Nous ne stockons pas vos numéros de carte bancaire complets.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Utilisation des données</h2>
            <p className="mb-2">
              Nous utilisons vos données pour :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fournir et maintenir nos services.</li>
              <li>Améliorer et personnaliser votre expérience utilisateur.</li>
              <li>Communiquer avec vous concernant votre compte, les mises à jour et le support client.</li>
              <li>Détecter, prévenir et résoudre les problèmes techniques et de sécurité.</li>
              <li>Respecter nos obligations légales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Partage des données</h2>
            <p className="mb-2">
              Nous ne vendons pas vos données personnelles. Nous pouvons partager vos informations avec :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Prestataires de services tiers :</strong> Hébergement, analyse, paiement, support client (sous réserve d'accords de confidentialité stricts).</li>
              <li><strong>Autorités légales :</strong> Si la loi l'exige ou pour protéger nos droits et notre sécurité.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre l'accès non autorisé, la modification, la divulgation ou la destruction. Cela inclut le chiffrement des données sensibles et des communications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Vos droits (RGPD)</h2>
            <p className="mb-2">
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Droit d'accès à vos données.</li>
              <li>Droit de rectification des données inexactes.</li>
              <li>Droit à l'effacement ("droit à l'oubli").</li>
              <li>Droit à la limitation du traitement.</li>
              <li>Droit à la portabilité des données.</li>
              <li>Droit d'opposition au traitement.</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, veuillez nous contacter à <a href="mailto:privacy@whappi.com" className="text-primary hover:underline">privacy@whappi.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Cookies</h2>
            <p>
              Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience, analyser l'utilisation du site et personnaliser le contenu. Vous pouvez gérer vos préférences en matière de cookies via les paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Modifications de la politique</h2>
            <p>
              Nous pouvons mettre à jour cette Politique de Confidentialité périodiquement. Nous vous informerons de tout changement important par email ou via une notification sur notre site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contact</h2>
            <p>
              Si vous avez des questions concernant cette Politique de Confidentialité, veuillez nous contacter à : <a href="mailto:privacy@whappi.com" className="text-primary hover:underline">privacy@whappi.com</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
