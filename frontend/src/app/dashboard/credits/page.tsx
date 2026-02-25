"use client"

import * as React from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { 
  Zap, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  BarChart3,
  LayoutDashboard,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CreditsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  
  const [balance, setBalance] = React.useState<number>(0)
  const [history, setHistory] = React.useState<any[]>([])
  const [stats, setStats] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    try {
      const token = await getToken()
      const [balanceRes, historyRes, statsRes] = await Promise.all([
        api.get("/api/v1/credits/balance", token || undefined),
        api.get("/api/v1/credits/history", token || undefined),
        api.get("/api/v1/credits/stats?days=7", token || undefined)
      ])

      setBalance(balanceRes?.balance || 0)
      setHistory(Array.isArray(historyRes) ? historyRes : (historyRes?.history || []))
      setStats(Array.isArray(statsRes) ? statsRes : (statsRes?.stats || []))
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => { fetchData() }, [fetchData])

  if (isLoading) return <div className="p-8 text-center">Chargement des crédits...</div>

  const usageLast7Days = stats.reduce((acc, curr) => acc + (curr.usage || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
          <LayoutDashboard className="h-3 w-3" />
          <span>Tableau de bord</span>
          <span>/</span>
          <span className="text-muted-foreground">Crédits</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-lg sm:text-xl font-semibold">Portefeuille</h1>
          <Badge variant="secondary" className="w-fit uppercase text-[9px] font-bold px-1.5 h-4 tracking-tighter">Plan Pro</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Solde actuel" value={balance} sub="crédits disponibles" />
        <StatCard label="Usage (7j)" value={usageLast7Days} sub="crédits consommés" />
        <StatCard label="Messages envoyés" value={balance} sub="capacité restante" />
        <StatCard label="Statut du compte" value="Actif" sub="vérifié" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Analyse de consommation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="usage" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Historique des transactions</p>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">Aucune transaction trouvée.</TableCell></TableRow>
                  ) : (
                    history.map(item => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{item.description}</TableCell>
                        <TableCell className={cn("text-xs font-bold text-right", item.type === 'add' ? "text-green-600" : "text-foreground")}>
                          {item.type === 'add' ? "+" : "-"}{Math.abs(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-sm font-medium">Réclamer des crédits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Réclamez vos crédits de bienvenue si vous ne l'avez pas encore fait.</p>
              <Button className="w-full h-9" onClick={async () => {
                const t = toast.loading("Réclamation...");
                try {
                  const token = await getToken();
                  await api.post("/api/v1/credits/claim-welcome", {}, token || undefined);
                  toast.success("60 crédits ajoutés !", { id: t });
                  fetchData();
                } catch (e) { toast.error("Déjà réclamé", { id: t }); }
              }}>Réclamer 60 crédits 🎁</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Informations</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• 1 message = 1 crédit.</p>
              <p>• Les messages entrants sont gratuits.</p>
              <p>• Historique conservé 30 jours.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; subText?: string; sub?: string }) {
  return (
    <Card className="shadow-none border-border/50">
      <CardContent className="p-4 sm:p-6">
        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</p>
        <p className="text-xl sm:text-2xl font-bold mt-1 text-foreground">{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase font-medium mt-1">{sub}</p>
      </CardContent>
    </Card>
  )
}
