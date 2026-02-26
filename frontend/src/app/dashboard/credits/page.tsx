"use client"

import * as React from "react"
import {
  Zap,
  History,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Plus
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function CreditsPage() {
  const { getToken } = useAuth()
  const [credits, setCredits] = React.useState<any>(null)
  const [history, setHistory] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.credits.get(token || undefined)
      setCredits(data?.data || data)
      // Note: History would come from another endpoint usually
      setHistory([])
    } catch (e) {
      toast.error("Erreur de chargement des crédits")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
         <Link href="/dashboard" className="hover:text-foreground transition-colors">Tableau de Bord</Link>
         <ChevronRight className="h-3 w-3" />
         <span className="text-foreground font-medium">Consommation & Crédits</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Vos Crédits Whappi
          </h1>
          <p className="text-sm text-muted-foreground">Suivi de votre consommation d&apos;intelligence artificielle.</p>
        </div>

        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 h-auto text-[10px] font-bold uppercase tracking-widest rounded-full">
           Plan : Free Trial
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
           { label: "Balance Actuelle", val: credits?.balance || 0, sub: "crédits dispos", icon: Zap },
           { label: "Utilisé (30j)", val: "42", sub: "messages IA", icon: TrendingUp },
           { label: "Économisé", val: "12€", sub: "vs assistant humain", icon: ShieldCheck },
           { label: "Validité", val: "Illimitée", sub: "pas d'expiration", icon: History }
         ].map((stat, i) => (
           <Card key={i} className="border-none shadow-none bg-muted/20">
             <CardContent className="p-4">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.val}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{stat.sub}</p>
             </CardContent>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
         <div className="space-y-6">
            <Card className="border-none bg-muted/10 shadow-none">
               <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-bold uppercase tracking-tight">Historique de Consommation</CardTitle>
               </CardHeader>
               <CardContent className="pt-6">
                  <div className="h-[300px] flex items-center justify-center border border-dashed rounded-lg bg-background/50 text-muted-foreground text-xs italic">
                     Graphique de consommation (Bientôt disponible)
                  </div>

                  <Table className="mt-8">
                     <TableHeader>
                        <TableRow className="border-muted/30">
                           <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                           <TableHead className="text-[10px] uppercase font-bold">Action</TableHead>
                           <TableHead className="text-[10px] uppercase font-bold text-right">Crédits</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        <TableRow className="border-muted/20">
                           <TableCell colSpan={3} className="text-center py-10 text-xs text-muted-foreground opacity-40">
                              Aucune transaction récente.
                           </TableCell>
                        </TableRow>
                     </TableBody>
                  </Table>
               </CardContent>
            </Card>
         </div>

         <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
               <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                     <Plus className="h-4 w-4 text-primary" /> Recharger
                  </CardTitle>
                  <CardDescription className="text-xs">Ajoutez des crédits à votre compte instantanément.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="p-4 bg-background rounded border text-center space-y-2">
                     <p className="text-2xl font-bold">9.99€</p>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase">Pack 500 Crédits</p>
                     <Button size="sm" className="w-full h-8 rounded-full text-xs" asChild>
                        <Link href="/dashboard/billing">Acheter</Link>
                     </Button>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                     Les crédits sont consommés uniquement lors de l&apos;utilisation des modèles LLM (IA).
                  </p>
               </CardContent>
            </Card>

            <Card className="border-none bg-muted/20 shadow-none">
               <CardHeader>
                  <CardTitle className="text-sm font-bold">Comment ça marche ?</CardTitle>
               </CardHeader>
               <CardContent className="text-[11px] text-muted-foreground leading-relaxed space-y-3">
                  <p>• 1 message généré par l&apos;IA = 1 crédit.</p>
                  <p>• Les réponses par mots-clés sont gratuites.</p>
                  <p>• La modération de groupe est gratuite.</p>
                  <Button variant="link" className="p-0 h-auto text-[11px] font-bold text-primary">En savoir plus →</Button>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  )
}
