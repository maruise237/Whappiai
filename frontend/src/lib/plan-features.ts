type Translator = (key: string, opts?: Record<string, unknown>) => string

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

const planIds: PlanCard["id"][] = ["trial", "starter", "pro", "business"]

function getPlanCode(plan?: unknown) {
  const value = String(plan || "trial").toLowerCase()
  if (value.includes("starter")) return "starter"
  if (value.includes("business") || value.includes("organisation") || value.includes("organization")) return "business"
  if (value.includes("pro")) return "pro"
  if (value.includes("trial") || value.includes("essai") || value.includes("free")) return "trial"
  return value || "trial"
}

export function getPlanCards(t: Translator): PlanCard[] {
  return planIds.map(id => ({
    id,
    name: t(`plan_${id}_name`),
    price: t(`plan_${id}_price`),
    cadence: t(`plan_${id}_cadence`),
    description: t(`plan_${id}_description`),
    features: [1, 2, 3, 4, 5].map(index => t(`plan_${id}_feature_${index}`)),
    cta: t(`plan_${id}_cta`),
    footer: t(`plan_${id}_footer`),
    highlighted: id === "pro",
  }))
}

export function getPlanComparisonRows(t: Translator) {
  return [
    { feature: t("compare_feature_trial"), starter: t("compare_value_after_trial"), pro: t("compare_value_after_trial"), business: t("compare_value_after_trial") },
    { feature: t("compare_feature_groups"), starter: "3", pro: "6", business: "16" },
    { feature: t("compare_feature_links"), starter: t("compare_value_included"), pro: t("compare_value_included"), business: t("compare_value_included") },
    { feature: t("compare_feature_words"), starter: t("compare_value_custom"), pro: t("compare_value_custom"), business: t("compare_value_custom") },
    { feature: t("compare_feature_exclusion"), starter: t("compare_value_included"), pro: t("compare_value_included"), business: t("compare_value_included") },
    { feature: t("compare_feature_welcome"), starter: t("compare_value_included"), pro: t("compare_value_included"), business: t("compare_value_included") },
    { feature: t("compare_feature_presets"), starter: "-", pro: t("compare_value_included"), business: t("compare_value_included") },
    { feature: t("compare_feature_ai_assistant"), starter: "-", pro: t("compare_value_included"), business: t("compare_value_included") },
    { feature: t("compare_feature_ai_generation"), starter: "-", pro: t("compare_value_included"), business: t("compare_value_included") },
    { feature: t("compare_feature_scheduled"), starter: "-", pro: t("compare_value_included"), business: t("compare_value_unlimited") },
  ]
}

export function getPlanScheduledMessageLabel(plan: string, t?: Translator) {
  const code = getPlanCode(plan)
  if (code === "pro" || code === "business") return t ? t("scheduled_messages_unlimited") : "Illimites"
  return t ? t("scheduled_messages_not_included") : "Non inclus"
}
