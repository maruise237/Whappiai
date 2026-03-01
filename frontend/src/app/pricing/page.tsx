import React from "react"
import Link from "next/link"
import { Check } from "lucide-react"

const PLANS = [
  {
    name: "Starter",
    price: "2 500 FCFA",
    description: "Idéal pour démarrer",
    features: [
      "Jusqu"à 2,000 messages/mois",
      "Support par email",
      "Accès API standard",
      "1 instance WhatsApp"
    ],
    url: "https://esaystor.online/prd_jx0jkk",
    highlight: false
  },
  {
    name: "Pro",
    price: "5 000 FCFA",
    description: "Pour les professionnels actifs",
    features: [
      "Jusqu"à 10,000 messages/mois",
      "Support prioritaire",
      "Accès API complet",
      "3 instances WhatsApp",
      "Statistiques avancées"
    ],
    url: "https://esaystor.online/prd_l2es24",
    highlight: true
  },
  {
    name: "Business",
    price: "10 000 FCFA",
    description: "Pour les grandes entreprises",
    features: [
      "Jusqu"à 100,000 messages/mois",
      "Support dédié 24/7",
      "Accès API illimité",
      "Instances illimitées",
      "IA personnalisée"
    ],
    url: "https://esaystor.online/prd_twafj6",
    highlight: false
  }
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Choisissez votre plan
        </h2>
        <p className="mt-4 text-xl text-gray-600">
          Des tarifs simples et transparents pour tous vos besoins WhatsApp.
        </p>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md inline-block">
          <p className="text-sm text-yellow-800">
            <strong>Important :</strong> Veuillez utiliser la même adresse email que votre compte Whappi
            lors du paiement pour l"activation automatique.
          </p>
        </div>
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-x-8 max-w-7xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative p-8 bg-white border rounded-2xl shadow-sm flex flex-col ${
              plan.highlight
                ? "border-indigo-600 ring-2 ring-indigo-600 transform scale-105 z-10"
                : "border-gray-200"
            }`}
          >
            {plan.highlight && (
              <div className="absolute top-0 right-0 -mt-4 mr-4 bg-indigo-600 text-white text-xs font-bold
                px-3 py-1 rounded-full uppercase tracking-wide">
                Populaire
              </div>
            )}

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-4 flex items-baseline text-gray-900">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="ml-1 text-xl font-semibold text-gray-500">/mois</span>
              </p>
              <p className="mt-6 text-gray-500">{plan.description}</p>

              <ul className="mt-6 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex">
                    <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
                    <span className="ml-3 text-gray-500">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={`/register?plan=${plan.name.toLowerCase()}`}
              className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                plan.highlight
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              Commencer avec {plan.name}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center space-y-4">
        <p className="text-gray-600">
          Déjà un compte ?{" "}
          <Link href="/dashboard/billing" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Gérer mon abonnement
          </Link>
        </p>
        <div>
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 font-medium">
            Retour au tableau de bord
            </Link>
        </div>
      </div>
    </div>
  )
}
