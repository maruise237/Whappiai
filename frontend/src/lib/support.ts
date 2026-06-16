export function formatSupportStatus(status: string) {
  const value = String(status || "").toLowerCase()
  if (value === "open") return "Ouvert"
  if (value === "pending") return "En cours"
  if (value === "resolved") return "Resolue"
  if (value === "closed") return "Fermee"
  return value || "Inconnu"
}

export function supportStatusClass(status: string) {
  const value = String(status || "").toLowerCase()
  if (value === "open") return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10"
  if (value === "pending") return "bg-sky-500/10 text-sky-600 hover:bg-sky-500/10"
  if (value === "resolved") return "bg-primary/10 text-primary hover:bg-primary/10"
  if (value === "closed") return "bg-muted text-muted-foreground hover:bg-muted"
  return "bg-muted text-muted-foreground hover:bg-muted"
}

export function formatSupportCategory(category: string) {
  const value = String(category || "").toLowerCase()
  if (value === "payment") return "Paiement"
  if (value === "technical") return "Technique"
  if (value === "billing") return "Abonnement"
  if (value === "feedback") return "Retour produit"
  return "General"
}

export function paymentStatusClass(status: string) {
  const value = String(status || "").toLowerCase()
  if (["completed", "success", "paid"].includes(value)) return "bg-primary/10 text-primary hover:bg-primary/10"
  if (["failed", "error"].includes(value)) return "bg-destructive/10 text-destructive hover:bg-destructive/10"
  if (["needs_review", "manual_review", "review"].includes(value)) return "bg-orange-500/10 text-orange-600 hover:bg-orange-500/10"
  if (["pending", "created"].includes(value)) return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10"
  if (["cancelled", "canceled"].includes(value)) return "bg-muted text-muted-foreground hover:bg-muted"
  return "bg-muted text-muted-foreground hover:bg-muted"
}

export function formatPaymentStatus(status: string) {
  const value = String(status || "").toLowerCase()
  if (value === "completed") return "Paye"
  if (value === "failed") return "Echec"
  if (value === "needs_review" || value === "manual_review" || value === "review") return "A verifier"
  if (value === "pending") return "En attente"
  if (value === "created") return "Cree"
  if (value === "cancelled" || value === "canceled") return "Annule"
  return value || "Inconnu"
}

export function supportPriorityClass(priority: string) {
  const value = String(priority || "").toLowerCase()
  if (value === "urgent") return "bg-destructive/10 text-destructive hover:bg-destructive/10"
  if (value === "high") return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10"
  if (value === "low") return "bg-muted text-muted-foreground hover:bg-muted"
  return "bg-primary/10 text-primary hover:bg-primary/10"
}

export function formatSupportPriority(priority: string) {
  const value = String(priority || "").toLowerCase()
  if (value === "urgent") return "Urgent"
  if (value === "high") return "Haute"
  if (value === "low") return "Basse"
  return "Normale"
}
