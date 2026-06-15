import { getPlanCode } from "@/components/dashboard/plan-badge"

export type PlanCard = {
  id: "trial" | "starter" | "pro" | "business"
  name: string
  price: string
  cadence: string
  description: string
  features: string[]
  cta: string
  footer: string
  highlighted: boolean
}

export const PLAN_CARDS: PlanCard[] = [
  {
    id: "trial",
    name: "Essai gratuit",
    price: "7 jours",
    cadence: "sans engagement",
    description: "Pour connecter 1 groupe et verifier que Whappi modere bien en situation reelle.",
    features: [
      "1 groupe pendant 7 jours",
      "Blocage des liens",
      "Mots interdits choisis manuellement",
      "Auto-exclusion activable",
      "Message de bienvenue redige par vous",
    ],
    cta: "Commencer l'essai",
    footer: "Le plus simple pour valider votre premier groupe",
    highlighted: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "3 500 FCFA",
    cadence: "/mois",
    description: "Pour moderer simplement jusqu'a 3 groupes avec les regles essentielles.",
    features: [
      "Jusqu'a 3 groupes",
      "Blocage des liens",
      "Mots interdits choisis manuellement",
      "Auto-exclusion activable",
      "Message de bienvenue redige par vous",
    ],
    cta: "Passer sur Starter",
    footer: "Parfait pour demarrer proprement",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro IA",
    price: "8 000 FCFA",
    cadence: "/mois",
    description: "Pour aller plus loin avec l'IA sur jusqu'a 6 groupes.",
    features: [
      "Jusqu'a 6 groupes",
      "Toute la moderation Starter",
      "Presets de moderation rapides",
      "Assistant IA pour aider l'admin",
      "Generation IA pour vos groupes",
      "Messages programmes inclus",
    ],
    cta: "Passer sur Pro IA",
    footer: "Le meilleur point d'equilibre pour grandir",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "18 000 FCFA",
    cadence: "/mois",
    description: "Pour les structures qui veulent plus de puissance sur jusqu'a 16 groupes.",
    features: [
      "Jusqu'a 16 groupes",
      "Tout le plan Pro IA",
      "Messages programmes sans limite",
      "Generation IA pour vos groupes",
      "Protection etendue sur plus de groupes",
    ],
    cta: "Passer sur Business",
    footer: "Pour les reseaux qui veulent scaler serieusement",
    highlighted: false,
  },
]

export const PLAN_COMPARISON_ROWS = [
  { feature: "Periode d'essai", starter: "Apres essai", pro: "Apres essai", business: "Apres essai" },
  { feature: "Groupes geres", starter: "3", pro: "6", business: "16" },
  { feature: "Blocage des liens", starter: "Inclus", pro: "Inclus", business: "Inclus" },
  { feature: "Mots interdits", starter: "Personnalises", pro: "Personnalises", business: "Personnalises" },
  { feature: "Auto-exclusion", starter: "Inclus", pro: "Inclus", business: "Inclus" },
  { feature: "Message de bienvenue manuel", starter: "Inclus", pro: "Inclus", business: "Inclus" },
  { feature: "Presets de moderation", starter: "-", pro: "Inclus", business: "Inclus" },
  { feature: "Assistant IA", starter: "-", pro: "Inclus", business: "Inclus" },
  { feature: "Generation IA", starter: "-", pro: "Inclus", business: "Inclus" },
  { feature: "Messages programmes", starter: "-", pro: "Inclus", business: "Sans limite" },
]

export function getPlanScheduledMessageLabel(plan: string) {
  const code = getPlanCode(plan)
  if (code === "pro" || code === "business") return "Illimites"
  return "Non inclus"
}

