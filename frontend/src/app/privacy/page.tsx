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
              La confidentialité de vos données est une priorité pour Whappi (&quot;nous&quot;, &quot;notre&quot;,
              &quot;nos&quot;). Cette Politique de Confidentialité décrit comment nous collectons, utilisons,
              partageons et protégeons vos informations personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Données collectées</h2>
            <p className="mb-2">
              Nous collectons les types d&apos;informations suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Informations de compte :</strong> Nom, prénom, adresse email, mot de passe (chiffré).</li>
              <li><strong>Données de communication :</strong> Numéros, historiques (chiffrés), métadonnées.</li>
              <li><strong>Informations techniques :</strong> Adresse IP, type de navigateur, système d&apos;exploitation.</li>
              <li><strong>Informations de paiement :</strong> Traitées par nos prestataires de paiement sécurisés.</li>
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
              <li>Communiquer avec vous concernant votre compte et le support.</li>
              <li>Détecter, prévenir et résoudre les problèmes techniques.</li>
              <li>Respecter nos obligations légales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Partage des données</h2>
            <p className="mb-2">
              Nous ne vendons pas vos données. Nous pouvons partager vos informations avec :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Prestataires tiers :</strong> Hébergement, analyse, paiement (sous accords stricts).</li>
              <li><strong>Autorités légales :</strong> Si la loi l&apos;exige ou pour protéger nos droits.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données contre l&apos;accès
              non autorisé. Cela inclut le chiffrement des données sensibles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Vos droits (RGPD)</h2>
            <p className="mb-2">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Droit d&apos;accès à vos données.</li>
              <li>Droit de rectification des données inexactes.</li>
              <li>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;).</li>
              <li>Droit à la limitation du traitement.</li>
              <li>Droit à la portabilité des données.</li>
              <li>Droit d&apos;opposition au traitement.</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous à
              <a href="mailto:privacy@whappi.com" className="text-primary hover:underline ml-1">privacy@whappi.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Cookies</h2>
            <p>
              Nous utilisons des cookies pour améliorer votre expérience et analyser l&apos;utilisation du site.
              Gérez vos préférences via les paramètres de votre navigateur.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette Politique périodiquement. Nous vous informerons de tout changement
              important par email ou via une notification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contact</h2>
            <p>
              Des questions ? Contactez-nous à :
              <a href="mailto:privacy@whappi.com" className="text-primary hover:underline ml-1">privacy@whappi.com</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
