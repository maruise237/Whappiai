"use client"

import * as React from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { 
  Zap, 
  TrendingUp, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck,
  CreditCard,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Sparkles
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface CreditHistory {
  id: number
  amount: number
  type: 'add' | 'usage'
  description: string
  created_at: string
}

interface CreditStats {
  date: string
  usage: number
  added: number
}

export default function CreditsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { toast } = useToast()
  
  const [balance, setBalance] = React.useState<number>(0)
  const [history, setHistory] = React.useState<CreditHistory[]>([])
  const [stats, setStats] = React.useState<CreditStats[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isClaiming, setIsClaiming] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      const [balanceRes, historyRes, statsRes] = await Promise.all([
        api.get("/api/v1/credits/balance", token),
        api.get("/api/v1/credits/history", token),
        api.get("/api/v1/credits/stats?days=7", token)
      ])

      setBalance(balanceRes.balance || 0)
      setHistory(historyRes.history || [])
      setStats(statsRes.stats || [])
    } catch (error) {
      console.error("Error fetching credit data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleClaimCredits = async () => {
    setIsClaiming(true)
    try {
      const token = await getToken()
      await api.post("/api/v1/credits/claim-welcome", {}, token)
      toast({
        title: "Succès !",
        description: "60 crédits de bienvenue ont été ajoutés à votre compte.",
      })
      fetchData()
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réclamer les crédits.",
        variant: "destructive",
      })
    } finally {
      setIsClaiming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-[400px] bg-muted rounded-xl" />
      </div>
    )
  }

  const usageLast7Days = stats.reduce((acc, curr) => acc + curr.usage, 0)
  const showClaimButton = balance < 100

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium text-foreground">Crédits</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Crédits</h1>
          <Badge variant="outline" className="px-3 py-1 border-primary/20 bg-primary/5 text-primary">
            Plan Premium 2025
          </Badge>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-sm ring-1 ring-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary/70 font-medium">Solde Actuel</CardDescription>
            <CardTitle className="text-4xl font-bold">{balance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-primary/60">
              <Zap className="w-3 h-3 fill-current" />
              <span>Crédits disponibles</span>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-16 h-16 text-primary" />
          </div>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Utilisation (7j)</CardDescription>
            <CardTitle className="text-3xl font-bold">{usageLast7Days}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-destructive">
              <TrendingUp className="w-3 h-3" />
              <span>Consommation active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Messages Restants</CardDescription>
            <CardTitle className="text-3xl font-bold">{balance}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.min((balance / 1000) * 100, 100)} className="h-2 mt-1" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Status Compte</CardDescription>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Vérifié via Clerk Auth</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Graphique d'utilisation */}
        <Card className="lg:col-span-2 shadow-sm border-border/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/20 pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Analyse de Consommation
              </CardTitle>
              <CardDescription>Usage des crédits sur les 7 derniers jours</CardDescription>
            </div>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="usage" 
                    name="Consommation"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorUsage)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Actions & Promo */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-sm border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Besoin de plus ?
              </CardTitle>
              <CardDescription>Boostez votre limite de messages instantanément.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage actuel</span>
                  <span className="font-medium">{balance} / 1000</span>
                </div>
                <Progress value={(balance / 1000) * 100} className="h-2" />
              </div>
              
              {showClaimButton && (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 shadow-md"
                  onClick={handleClaimCredits}
                  disabled={isClaiming}
                >
                  {isClaiming ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Réclamer 60 Crédits Gratuits
                    </>
                  )}
                </Button>
              )}
              
              <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10" asChild>
                <a href="/dashboard/billing">Voir les forfaits Pro</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Sécurité & Transparence
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• 1 crédit = 1 message WhatsApp envoyé avec succès.</p>
              <p>• Les messages reçus sont illimités et gratuits.</p>
              <p>• Historique conservé pendant 30 jours.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historique des transactions */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="border-b border-border/50 bg-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Historique des Mouvements
              </CardTitle>
              <CardDescription>Détail de vos ajouts et consommations de crédits</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData} className="h-8 text-xs">
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/20">
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Aucune transaction trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item.id} className="group cursor-default">
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell>
                      {item.type === 'add' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 font-normal">
                          <ArrowDownLeft className="w-3 h-3" /> Ajout
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 gap-1 font-normal">
                          <ArrowUpRight className="w-3 h-3" /> Usage
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-bold",
                      item.type === 'add' ? "text-green-600" : "text-foreground"
                    )}>
                      {item.type === 'add' ? "+" : "-"}{Math.abs(item.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="py-3 bg-muted/5 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            Affichage des 20 dernières transactions. Contactez le support pour un export complet.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
