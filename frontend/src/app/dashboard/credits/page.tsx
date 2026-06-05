"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Gauge, History, ShieldCheck, TrendingUp, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/clerk-react"
import { toast } from "sonner"

type UsageData = {
  balance?: number
  used?: number
  plan?: string
}

export default function CreditsPage() {
  const { getToken } = useAuth()
  const [usage, setUsage] = React.useState<UsageData | null>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.credits.get(token || undefined)
      setUsage((data?.data || data) as UsageData)
    } catch (error) {
      console.error(error)
      toast.error("Erreur de chargement de l'usage")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const used = usage?.used || 0
  const remaining = usage?.balance || 0
  const total = used + remaining
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/dashboard" className="transition-colors hover:text-foreground">Centre</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-foreground">Usage du forfait</span>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Gauge className="h-5 w-5 text-primary" /> Usage du forfait
          </h1>
          <p className="text-sm text-muted-foreground">Suivez les actions Whappi consommees par vos sessions et groupes.</p>
        </div>

        <Badge variant="outline" className="h-auto rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
          Plan : {usage?.plan || "Essai gratuit"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Actions restantes", val: loading ? "..." : remaining, sub: "ce mois", icon: Zap },
          { label: "Actions utilisees", val: loading ? "..." : used, sub: "sessions et groupes", icon: TrendingUp },
          { label: "Protection active", val: "A configurer", sub: "anti-liens, accueil", icon: ShieldCheck },
          { label: "Cycle", val: "Mensuel", sub: "remise a zero automatique", icon: History }
        ].map((stat) => (
          <Card key={stat.label} className="bg-card shadow-none">
            <CardContent className="p-4">
              <stat.icon className="mb-3 h-4 w-4 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{stat.val}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <Card className="bg-card shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">Consommation mensuelle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border bg-background/60 p-5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Actions consommees</span>
                <span className={percentage > 80 ? "text-destructive" : "text-primary"}>{percentage}%</span>
              </div>
              <Progress value={percentage} className="mt-3 h-2" />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Une action correspond a une intervention Whappi utile : moderation, avertissement, message d&apos;accueil ou verification appliquee par une session.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Moderation", "Blocages et avertissements"],
                ["Accueil", "Messages aux nouveaux membres"],
                ["Verification", "Suivi des groupes administres"],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border bg-background/60 p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-sm font-semibold">Besoin de plus de volume ?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Passez sur un forfait avec plus de sessions et d&apos;actions mensuelles au lieu d&apos;acheter des packs compliques.
                </p>
              </div>
              <Button size="sm" className="w-full" asChild>
                <Link href="/dashboard/billing">Voir les forfaits</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-none">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Principe simple</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
              <p>1. Connectez une session WhatsApp.</p>
              <p>2. Choisissez les groupes ou elle est admin.</p>
              <p>3. Activez les regles utiles et suivez les actions.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
