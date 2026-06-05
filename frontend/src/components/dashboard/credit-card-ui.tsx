"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Gauge, Zap } from "lucide-react"
import Link from "next/link"

interface CreditCardUIProps {
  credits: {
    balance: number
    used: number
    plan: string
    history: Array<unknown>
  } | null
  userRole: string | null
}

export function CreditCardUI({ credits, userRole }: CreditCardUIProps) {
  if (!credits || userRole === "admin") return null

  const total = (credits.balance || 0) + (credits.used || 0)
  const usagePercentage = total > 0 ? Math.round(((credits.used || 0) / total) * 100) : 0

  return (
    <Card className="bg-card shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Usage du forfait</p>
              <p className="text-xs text-muted-foreground">Actions Whappi du mois</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs uppercase">
            {credits.plan}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-4">
        <div className="rounded-lg border bg-background/60 py-4 text-center">
          <p className="text-xs font-medium text-muted-foreground">Actions restantes</p>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold text-primary">{credits.balance}</span>
            <span className="text-xs text-muted-foreground">ce mois</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Consommation</span>
            <span className={usagePercentage > 80 ? "text-destructive" : "text-primary"}>
              {usagePercentage}%
            </span>
          </div>
          <Progress value={usagePercentage} className="h-1.5" />
          <p className="text-[11px] leading-4 text-muted-foreground">
            Les actions couvrent la moderation, l&apos;accueil et les avertissements appliques dans vos groupes.
          </p>
        </div>

        <Button asChild className="h-9 w-full gap-2" size="sm">
          <Link href="/dashboard/billing">
            <Zap className="h-3.5 w-3.5" />
            Ajuster le forfait
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
