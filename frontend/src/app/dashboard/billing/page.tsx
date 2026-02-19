import { BillingPlans } from "@/components/dashboard/billing-plans"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Facturation | Whappi",
  description: "Gérez votre abonnement Whappi",
}

export default function BillingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Abonnement</h1>
        <p className="text-muted-foreground">
          Gérez votre plan et vos limites de messages.
        </p>
      </div>
      
      <BillingPlans />
    </div>
  )
}
